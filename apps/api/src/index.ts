import { buildServer } from "./server";
import { attachWebSocketGateway, drainWebSocketGateway } from "./ws";
import { env } from "./env";

const app = buildServer();
// Fastify creates its http server eagerly, so we can attach the WS upgrade handler
// before listen().
const wss = attachWebSocketGateway(app.server);

app
  .listen({ port: env.API_PORT, host: "0.0.0.0" })
  .then((address) => {
    console.log(`api listening on ${address}  (ws: ws://localhost:${env.API_PORT}/ws)`);
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });

// Graceful shutdown (S15): on SIGTERM (what an orchestrator sends before replacing the pod), drain the
// WebSockets first — tell clients to reconnect elsewhere — then close HTTP. A hard exit here would
// drop every live collaborator's connection at once; instead they reconnect to the new instance and
// catch up from their lastSeq. Deploys become invisible.
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — draining WebSockets, then closing HTTP`);
  try {
    await drainWebSocketGateway(wss);
    await app.close();
    process.exit(0);
  } catch (err) {
    console.error("error during graceful shutdown", err);
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
