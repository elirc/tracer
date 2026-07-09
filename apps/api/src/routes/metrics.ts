import type { FastifyInstance } from "fastify";
import { snapshot } from "../lib/metrics";

/**
 * Metrics endpoint (S15). JSON rather than Prometheus text so it's readable in a browser during the
 * course; a real deployment would expose the same series in the scraper's format. The interesting
 * field is `slo.p95WithinBudget` — a boolean an alert can page on directly.
 */
export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/metrics", async () => snapshot());
}
