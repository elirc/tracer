import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { env } from "./env";
import { healthRoutes } from "./routes/health";
import { workspaceRoutes } from "./routes/workspaces";
import { authRoutes } from "./routes/auth";
import { teamRoutes } from "./routes/teams";
import { inviteRoutes } from "./routes/invites";
import { AppError } from "./errors";

/**
 * Build (but don't start) the app so tests can boot it in-process via `app.inject(...)`.
 * All handlers throw typed errors deep; we translate them to the JSON envelope
 * `{ error: { code, message } }` once, here at the edge.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });

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
  void app.register(authRoutes);
  void app.register(workspaceRoutes);
  void app.register(teamRoutes);
  void app.register(inviteRoutes);
  return app;
}
