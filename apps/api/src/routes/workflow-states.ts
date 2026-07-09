import type { FastifyInstance } from "fastify";
import { prisma } from "@tracer/db";
import { requireUser, requireTeamAccess } from "../auth/guards";

export async function workflowStateRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/teams/:teamId/workflow-states", async (req) => {
    const user = await requireUser(req);
    const { teamId } = req.params as { teamId: string };
    await requireTeamAccess(user.id, teamId);
    const states = await prisma.workflowState.findMany({
      where: { teamId },
      orderBy: { position: "asc" },
    });
    return states.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      position: s.position,
      color: s.color,
    }));
  });
}
