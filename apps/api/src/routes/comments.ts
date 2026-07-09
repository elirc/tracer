import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@tracer/db";
import { requireUser, requireTeamAccess } from "../auth/guards";
import { recordMutation } from "../lib/mutations";
import { AppError } from "../errors";

const CreateComment = z.object({
  body: z.string().min(1),
  mutationId: z.string().optional(),
});

interface CommentRow {
  id: string;
  issueId: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string | null; email: string };
}

function serialize(c: CommentRow) {
  return {
    id: c.id,
    issueId: c.issueId,
    body: c.body,
    author: { id: c.author.id, name: c.author.name, email: c.author.email },
    createdAt: c.createdAt.toISOString(),
  };
}

export async function commentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/issues/:issueId/comments", async (req) => {
    const user = await requireUser(req);
    const { issueId } = req.params as { issueId: string };
    const issue = await prisma.issue.findFirst({ where: { id: issueId, deletedAt: null } });
    if (!issue) throw new AppError(404, "NOT_FOUND", "Issue not found");
    await requireTeamAccess(user.id, issue.teamId);
    const rows = await prisma.comment.findMany({
      where: { issueId },
      orderBy: { createdAt: "asc" },
      include: { author: true },
    });
    return rows.map(serialize);
  });

  // Creating a comment records a mutation just like editing an issue — comments are synced entities.
  // The `teamId` on the delta means comment deltas are scoped to the issue's team, so clients
  // viewing that team get them live, for free.
  app.post("/api/v1/issues/:issueId/comments", async (req, reply) => {
    const user = await requireUser(req);
    const { issueId } = req.params as { issueId: string };
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: { team: true },
    });
    if (!issue) throw new AppError(404, "NOT_FOUND", "Issue not found");
    await requireTeamAccess(user.id, issue.teamId);
    const body = CreateComment.parse(req.body);

    const comment = await prisma.comment.create({
      data: { issueId, authorId: user.id, body: body.body },
      include: { author: true },
    });
    const payload = serialize(comment);
    await recordMutation({
      workspaceId: issue.team.workspaceId,
      teamId: issue.teamId,
      entity: "comment",
      entityId: comment.id,
      op: "create",
      data: payload,
      mutationId: body.mutationId,
    });
    reply.code(201);
    return payload;
  });
}
