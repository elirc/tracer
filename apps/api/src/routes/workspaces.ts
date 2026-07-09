import type { FastifyInstance } from "fastify";
import { prisma } from "@tracer/db";
import { WorkspaceListSchema } from "@tracer/shared";

export async function workspaceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/workspaces", async () => {
    const rows = await prisma.workspace.findMany({ orderBy: { createdAt: "asc" } });
    // Parse through the shared contract so the API can never return a shape the client
    // doesn't expect (and to serialize Date -> ISO string at the edge).
    return WorkspaceListSchema.parse(
      rows.map((w) => ({ ...w, createdAt: w.createdAt.toISOString() })),
    );
  });
}
