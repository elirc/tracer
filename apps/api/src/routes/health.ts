import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Liveness: is the process up?
  app.get("/health", async () => ({ status: "ok" }));
  // Readiness: can it serve traffic? For the skeleton these are the same; Sprint 05
  // splits them (readiness will check the DB) once deploy gates need it.
  app.get("/ready", async () => ({ status: "ready" }));
}
