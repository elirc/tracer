import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { prisma, type MutationLog, type User } from "@tracer/db";
import { SubscribeSchema, type MutationDelta, type ServerMessage } from "@tracer/shared";
import { getUserByToken, SESSION_COOKIE } from "./auth/session";
import { fanout } from "./lib/fanout";

const HEARTBEAT_MS = 30_000;

interface LiveSocket extends WebSocket {
  isAlive?: boolean;
  user?: User;
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

    let unsubscribe: (() => void) | null = null;
    ws.on("message", (raw) => {
      const parsed = SubscribeSchema.safeParse(safeJson(raw.toString()));
      if (!parsed.success) return;
      void handleSubscribe(ws, parsed.data.workspaceId, parsed.data.lastSeq, (u) => {
        unsubscribe?.();
        unsubscribe = u;
      });
    });
    ws.on("close", () => unsubscribe?.());
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

  // Subscribe FIRST and buffer, so nothing that lands during the backlog query is lost.
  const buffered: MutationDelta[] = [];
  let live = false;
  const unsub = fanout.subscribe((wsId, delta) => {
    if (wsId !== workspaceId) return;
    if (live) send(ws, { type: "delta", delta });
    else buffered.push(delta);
  });
  setUnsub(unsub);

  const backlog = await prisma.mutationLog.findMany({
    where: { workspaceId, seq: { gt: lastSeq } },
    orderBy: { seq: "asc" },
  });
  for (const m of backlog) send(ws, { type: "delta", delta: toDelta(m) });
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
