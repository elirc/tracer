import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { env } from "./env";
import { healthRoutes } from "./routes/health";
import { metricsRoutes } from "./routes/metrics";
import { workspaceRoutes } from "./routes/workspaces";
import { authRoutes } from "./routes/auth";
import { teamRoutes } from "./routes/teams";
import { inviteRoutes } from "./routes/invites";
import { issueRoutes } from "./routes/issues";
import { workflowStateRoutes } from "./routes/workflow-states";
import { meRoutes } from "./routes/me";
import { commentRoutes } from "./routes/comments";
import { savedViewRoutes } from "./routes/saved-views";
import { searchRoutes } from "./routes/search";
import { AppError } from "./errors";

/**
 * Build (but don't start) the app so tests can boot it in-process via `app.inject(...)`.
 * All handlers throw typed errors deep; we translate them to the JSON envelope
 * `{ error: { code, message } }` once, here at the edge.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({
    // Structured JSON logs in production; silent under test so the suite stays readable.
    logger: process.env.NODE_ENV === "production" ? { level: "info" } : false,
    // Request-ID correlation (S15): reuse an inbound `x-request-id` (so a trace spans the LB, the API,
    // and the logs) or mint one. Every log line Fastify emits is tagged with this id — the difference
    // between "grep and pray" and following one request across systems.
    genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? randomUUID(),
  });

  // Echo the request id back so the client (and its error reports) can quote it in a bug report.
  app.addHook("onRequest", async (req, reply) => {
    void reply.header("x-request-id", req.id);
  });

  // The web SPA is a different origin (port) in dev — allow it with credentials so the
  // session cookie round-trips. Same-site (both localhost) so lax cookies flow.
  void app.register(cors, { origin: env.WEB_URL, credentials: true });
  void app.register(cookie);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.status).send({ error: { code: err.code, message: err.message } });
      return;
    }
    if (err instanceof ZodError) {
      void reply.code(400).send({ error: { code: "VALIDATION", message: "Invalid request" } });
      return;
    }
    void reply.code(500).send({ error: { code: "INTERNAL", message: "Internal error" } });
  });

  void app.register(healthRoutes);
  void app.register(metricsRoutes);
  void app.register(authRoutes);
  void app.register(workspaceRoutes);
  void app.register(teamRoutes);
  void app.register(inviteRoutes);
  void app.register(issueRoutes);
  void app.register(workflowStateRoutes);
  void app.register(meRoutes);
  void app.register(commentRoutes);
  void app.register(savedViewRoutes);
  void app.register(searchRoutes);
  return app;
}
