import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@tracer/db";
import { visibleTeamIds } from "@tracer/shared";
import { requireUser } from "../auth/guards";

const Query = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(20).default(10),
});

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  // Server search — the "thorough / remote" half of hybrid search. The client does instant fuzzy
  // matching over its local store; this covers the long tail the client hasn't loaded. Scoped to
  // the teams the user may see (guests only search theirs) — a search index is a permission bypass
  // waiting to happen if you forget this.
  app.get("/api/v1/search", async (req) => {
    const user = await requireUser(req);
    const { q, limit } = Query.parse(req.query);

    const memberships = await prisma.membership.findMany({ where: { userId: user.id } });
    const teamIds: string[] = [];
    for (const m of memberships) {
      const teams = await prisma.team.findMany({
        where: { workspaceId: m.workspaceId },
        select: { id: true },
      });
      teamIds.push(
        ...visibleTeamIds(
          { role: m.role, guestTeamIds: m.guestTeamIds },
          teams.map((t) => t.id),
        ),
      );
    }
    if (teamIds.length === 0) return [];

    const rows = await prisma.issue.findMany({
      where: {
        teamId: { in: teamIds },
        deletedAt: null,
        title: { contains: q, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { team: true },
    });
    return rows.map((i) => ({
      id: i.id,
      identifier: `${i.team.key}-${i.number}`,
      title: i.title,
      teamId: i.teamId,
    }));
  });
}
