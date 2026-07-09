import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@tracer/db";
import { requireUser } from "../auth/guards";

const CreateWorkspace = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug must be kebab-case"),
});

export async function workspaceRoutes(app: FastifyInstance): Promise<void> {
  // Only the workspaces the current user is a member of — multi-tenancy by query scoping.
  app.get("/api/v1/workspaces", async (req) => {
    const user = await requireUser(req);
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));
  });

  // Create a workspace; the creator becomes its ADMIN in the same transaction.
  app.post("/api/v1/workspaces", async (req, reply) => {
    const user = await requireUser(req);
    const body = CreateWorkspace.parse(req.body);
    const ws = await prisma.workspace.create({
      data: {
        name: body.name,
        slug: body.slug,
        memberships: { create: { userId: user.id, role: "ADMIN", guestTeamIds: [] } },
      },
    });
    reply.code(201);
    return { id: ws.id, name: ws.name, slug: ws.slug, role: "ADMIN" as const };
  });
}
