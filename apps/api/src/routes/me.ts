import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@tracer/db";
import { requireUser } from "../auth/guards";

const Query = z.object({ limit: z.coerce.number().min(1).max(100).default(50) });

export async function meRoutes(app: FastifyInstance): Promise<void> {
  // "My Issues" — everything assigned to the current user, across every team. A canned view;
  // Sprint 10 generalizes these hard-coded views into saved filter ASTs.
  app.get("/api/v1/me/issues", async (req) => {
    const user = await requireUser(req);
    const q = Query.parse(req.query);
    const rows = await prisma.issue.findMany({
      where: { assigneeId: user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: q.limit,
      include: { state: true, team: true },
    });
    return rows.map((i) => ({
      id: i.id,
      identifier: `${i.team.key}-${i.number}`,
      title: i.title,
      priority: i.priority,
      state: { name: i.state.name, type: i.state.type },
      team: { id: i.team.id, name: i.team.name },
    }));
  });
}
