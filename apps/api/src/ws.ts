import { EventEmitter } from "node:events";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { prisma, type MutationLog, type User } from "@tracer/db";
import {
  ClientMessageSchema,
  canSeeDelta,
  type MembershipView,
  type MutationDelta,
  type ServerMessage,
} from "@tracer/shared";
import { getUserByToken, SESSION_COOKIE } from "./auth/session";
import { fanout } from "./lib/fanout";

const HEARTBEAT_MS = 30_000;

// Ephemeral presence bus — in-process, NEVER persisted. Presence ("Ada is viewing ENG") is the
// opposite of a mutation: high-churn, worthless a second later, and wrong to store. Routing it on a
// separate path from the durable mutation log is the S09 lesson (ADR-0008).
const presenceBus = new EventEmitter();
presenceBus.setMaxListeners(10_000);

interface PresenceEvent {
  workspaceId: string;
  userId: string;
  name: string | null;
  teamId: string;
}

interface LiveSocket extends WebSocket {
  isAlive?: boolean;
  user?: User;
  workspaceId?: string;
}

/**
 * The sync gateway (S06). Authenticates at UPGRADE time, then per connection: on `subscribe` it
 * verifies workspace membership, streams the backlog since the client's lastSeq (bootstrap), and
 * forwards live deltas. The bootstrap gap — a mutation landing *during* the backlog query — is
 * closed by subscribing to the fanout FIRST and buffering, then flushing anything the backlog
 * didn't already cover.
 */
export function attachWebSocketGateway(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }
    void authAndUpgrade(wss, req, socket, head);
  });

  wss.on("connection", (ws: LiveSocket) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Forward other users' presence in this socket's workspace (skip our own).
    const onPresence = (p: PresenceEvent) => {
      if (p.workspaceId !== ws.workspaceId || p.userId === ws.user?.id) return;
      send(ws, { type: "presence", userId: p.userId, name: p.name, teamId: p.teamId });
    };
    presenceBus.on("presence", onPresence);

    let unsubscribe: (() => void) | null = null;
    ws.on("message", (raw) => {
      const parsed = ClientMessageSchema.safeParse(safeJson(raw.toString()));
      if (!parsed.success) return;
      const msg = parsed.data;
      if (msg.type === "subscribe") {
        ws.workspaceId = msg.workspaceId;
        void handleSubscribe(ws, msg.workspaceId, msg.lastSeq, (u) => {
          unsubscribe?.();
          unsubscribe = u;
        });
      } else if (msg.type === "presence" && ws.user && ws.workspaceId) {
        presenceBus.emit("presence", {
          workspaceId: ws.workspaceId,
          userId: ws.user.id,
          name: ws.user.name,
          teamId: msg.teamId,
        } satisfies PresenceEvent);
      }
    });
    ws.on("close", () => {
      unsubscribe?.();
      presenceBus.off("presence", onPresence);
    });
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients as Set<LiveSocket>) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, HEARTBEAT_MS);
  wss.on("close", () => clearInterval(heartbeat));

  return wss;
}

async function authAndUpgrade(
  wss: WebSocketServer,
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): Promise<void> {
  // Auth happens here, at the upgrade, before a connection object even exists.
  const user = await getUserByToken(parseCookie(req.headers.cookie, SESSION_COOKIE));
  if (!user) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    (ws as LiveSocket).user = user;
    wss.emit("connection", ws, req);
  });
}

async function handleSubscribe(
  ws: LiveSocket,
  workspaceId: string,
  lastSeq: number,
  setUnsub: (u: () => void) => void,
): Promise<void> {
  const user = ws.user;
  if (!user) {
    send(ws, { type: "error", message: "unauthenticated" });
    ws.close();
    return;
  }

  // FLAW #4 (planted): this membership check is workspace-COARSE. A guest with access to only one
  // team still subscribes to — and receives — deltas for every team in the workspace. Sprint 13
  // fixes it with per-team channel authorization (the delta already carries teamId).
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });
  if (!membership) {
    send(ws, { type: "error", message: "forbidden" });
    ws.close();
    return;
  }
  // Per-team channel authz (flaw #4 fix): a delta carries the teamId it changed; we forward it only
  // if this member may read that team. The WebSocket now enforces the SAME scoping as REST — a guest
  // no longer receives deltas for teams they can't see.
  const access: MembershipView = { role: membership.role, guestTeamIds: membership.guestTeamIds };

  // Subscribe FIRST and buffer, so nothing that lands during the backlog query is lost.
  const buffered: MutationDelta[] = [];
  let live = false;
  const unsub = fanout.subscribe((wsId, delta) => {
    if (wsId !== workspaceId) return;
    if (!canSeeDelta(access, delta.teamId)) return;
    if (live) send(ws, { type: "delta", delta });
    else buffered.push(delta);
  });
  setUnsub(unsub);

  const backlog = await prisma.mutationLog.findMany({
    where: { workspaceId, seq: { gt: lastSeq } },
    orderBy: { seq: "asc" },
  });
  for (const m of backlog) {
    if (!canSeeDelta(access, m.teamId)) continue;
    send(ws, { type: "delta", delta: toDelta(m) });
  }
  const maxBacklogSeq = backlog.at(-1)?.seq ?? lastSeq;

  // Flush anything buffered during the query that the backlog didn't already include.
  let maxSeq = maxBacklogSeq;
  for (const d of buffered) {
    if (d.seq > maxBacklogSeq) {
      send(ws, { type: "delta", delta: d });
      maxSeq = Math.max(maxSeq, d.seq);
    }
  }
  live = true;
  send(ws, { type: "bootstrap-complete", lastSeq: maxSeq });
}

function toDelta(m: MutationLog): MutationDelta {
  return {
    seq: m.seq,
    entity: m.entity,
    entityId: m.entityId,
    op: m.op as MutationDelta["op"],
    teamId: m.teamId,
    mutationId: m.mutationId,
    data: m.op === "delete" ? null : m.patch,
  };
}

function send(ws: WebSocket, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}
