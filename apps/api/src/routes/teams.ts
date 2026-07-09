import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@tracer/db";
import { visibleTeamIds } from "@tracer/shared";
import { requireUser, requireMembership, requireAdmin } from "../auth/guards";

const CreateTeam = z.object({
  name: z.string().min(1),
  key: z.string().regex(/^[A-Z]{2,6}$/, "key must be 2-6 uppercase letters, e.g. ENG"),
});

export async function teamRoutes(app: FastifyInstance): Promise<void> {
  // Teams the member may see — guests are narrowed via the shared authz spine.
  app.get("/api/v1/workspaces/:wsId/teams", async (req) => {
    const user = await requireUser(req);
    const { wsId } = req.params as { wsId: string };
    const m = await requireMembership(user.id, wsId);
    const teams = await prisma.team.findMany({
      where: { workspaceId: wsId },
      orderBy: { createdAt: "asc" },
    });
    const allowed = new Set(
      visibleTeamIds({ role: m.role, guestTeamIds: m.guestTeamIds }, teams.map((t) => t.id)),
    );
    return teams
      .filter((t) => allowed.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, key: t.key }));
  });

  app.post("/api/v1/workspaces/:wsId/teams", async (req, reply) => {
    const user = await requireUser(req);
    const { wsId } = req.params as { wsId: string };
    const m = await requireMembership(user.id, wsId);
    requireAdmin(m);
    const body = CreateTeam.parse(req.body);
    const team = await prisma.team.create({
      data: { workspaceId: wsId, name: body.name, key: body.key },
    });
    reply.code(201);
    return { id: team.id, name: team.name, key: team.key };
  });
}
