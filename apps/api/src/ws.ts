import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { EchoMessageSchema } from "@tracer/shared";

const HEARTBEAT_MS = 30_000;

interface LiveSocket extends WebSocket {
  isAlive?: boolean;
}

/**
 * Attach a WebSocket gateway to an existing HTTP server. We handle the HTTP -> WS upgrade
 * ourselves so the lifecycle is explicit — Sprint 06 hooks authentication in right here,
 * at upgrade time. For the walking skeleton the gateway simply echoes messages back.
 */
export function attachWebSocketGateway(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: LiveSocket) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (data) => {
      const parsed = EchoMessageSchema.safeParse(safeJson(data.toString()));
      if (!parsed.success) return;
      ws.send(JSON.stringify({ ...parsed.data, ts: Date.now() }));
    });
  });

  // A dead connection looks alive until you ping it: terminate ones that miss a pong.
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

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}
