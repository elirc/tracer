import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, Prisma } from "@tracer/db";
import { FilterNodeSchema } from "@tracer/shared";
import { requireUser, requireTeamAccess } from "../auth/guards";
import { recordMutation } from "../lib/mutations";

const CreateView = z.object({
  name: z.string().min(1),
  filter: FilterNodeSchema, // validated: only known fields/ops can be stored
});

interface ViewRow {
  id: string;
  teamId: string;
  name: string;
  filter: unknown;
}

function serialize(v: ViewRow) {
  return { id: v.id, teamId: v.teamId, name: v.name, filter: v.filter };
}

export async function savedViewRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/teams/:teamId/views", async (req) => {
    const user = await requireUser(req);
    const { teamId } = req.params as { teamId: string };
    await requireTeamAccess(user.id, teamId);
    const rows = await prisma.savedView.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((v) => serialize({ id: v.id, teamId: v.teamId, name: v.name, filter: v.filter }));
  });

  app.post("/api/v1/teams/:teamId/views", async (req, reply) => {
    const user = await requireUser(req);
    const { teamId } = req.params as { teamId: string };
    const { team } = await requireTeamAccess(user.id, teamId);
    const body = CreateView.parse(req.body);
    const view = await prisma.savedView.create({
      data: { teamId, name: body.name, filter: body.filter as unknown as Prisma.InputJsonValue },
    });
    const payload = serialize({ id: view.id, teamId, name: view.name, filter: body.filter });
    // A saved view is a synced entity too — creating one streams to every client.
    await recordMutation({
      workspaceId: team.workspaceId,
      teamId,
      entity: "view",
      entityId: view.id,
      op: "create",
      data: payload,
    });
    reply.code(201);
    return payload;
  });
}
