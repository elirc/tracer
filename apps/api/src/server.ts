import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "./routes/health";
import { workspaceRoutes } from "./routes/workspaces";

/**
 * Build (but do NOT start) the Fastify app. Keeping build() separate from listen() lets
 * tests boot the whole app in-process with `app.inject(...)` — no real port, no flakiness.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(healthRoutes);
  app.register(workspaceRoutes);
  return app;
}
