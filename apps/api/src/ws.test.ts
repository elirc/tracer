import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket } from "ws";
import { attachWebSocketGateway } from "./ws";

let server: Server;
let port: number;

beforeAll(async () => {
  server = createServer();
  attachWebSocketGateway(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("ws echo gateway", () => {
  it("echoes an EchoMessage back to the sender", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    const reply = await new Promise<string>((resolve, reject) => {
      ws.on("open", () =>
        ws.send(JSON.stringify({ type: "echo", payload: "hello", ts: Date.now() })),
      );
      ws.on("message", (d) => resolve(d.toString()));
      ws.on("error", reject);
    });
    ws.close();

    const parsed = JSON.parse(reply) as { type: string; payload: string };
    expect(parsed.type).toBe("echo");
    expect(parsed.payload).toBe("hello");
  });
});
