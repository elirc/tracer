import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, type Priority, type StateType } from "@tracer/db";
import { requireUser, requireTeamAccess } from "../auth/guards";
import { decodeCursor, encodeCursor } from "../lib/pagination";
import { AppError } from "../errors";

const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATE_TYPES = ["BACKLOG", "UNSTARTED", "STARTED", "DONE", "CANCELED"] as const;

const CreateIssue = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  stateId: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
});

const UpdateIssue = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  stateId: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
});

const ListQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  stateType: z.enum(STATE_TYPES).optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
});

interface IssueRow {
  id: string;
  number: number;
  title: string;
  description: string;
  priority: Priority;
  state: { id: string; name: string; type: StateType };
  assignee: { id: string; name: string | null; email: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(i: IssueRow, teamKey: string) {
  return {
    id: i.id,
    identifier: `${teamKey}-${i.number}`,
    number: i.number,
    title: i.title,
    description: i.description,
    priority: i.priority,
    state: { id: i.state.id, name: i.state.name, type: i.state.type },
    assignee: i.assignee ? { id: i.assignee.id, name: i.assignee.name, email: i.assignee.email } : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

export async function issueRoutes(app: FastifyInstance): Promise<void> {
  // Create — the identifier arc. We increment the team counter ATOMICALLY and use the returned
  // value. A read-MAX-then-write would let two concurrent creates land on the same number; the
  // DB serializes this single-row increment for us, gaplessly. (Same shape as invoice numbers
  // in Meridian S9 — recognize it.)
  app.post("/api/v1/teams/:teamId/issues", async (req, reply) => {
    const user = await requireUser(req);
    const { teamId } = req.params as { teamId: string };
    await requireTeamAccess(user.id, teamId);
    const body = CreateIssue.parse(req.body);

    const state = body.stateId
      ? await prisma.workflowState.findFirst({ where: { id: body.stateId, teamId } })
      : await prisma.workflowState.findFirst({ where: { teamId }, orderBy: { position: "asc" } });
    if (!state) throw new AppError(400, "NO_STATE", "team has no workflow state");

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { issueCounter: { increment: 1 } },
    });

    const issue = await prisma.issue.create({
      data: {
        teamId,
        number: team.issueCounter,
        title: body.title,
        description: body.description ?? "",
        stateId: state.id,
        priority: body.priority ?? "NONE",
        assigneeId: body.assigneeId ?? null,
      },
      include: { state: true, assignee: true },
    });
    reply.code(201);
    return serialize(issue, team.key);
  });

  // List — cursor pagination + filters. Soft-deleted rows are excluded (deletedAt: null).
  app.get("/api/v1/teams/:teamId/issues", async (req) => {
    const user = await requireUser(req);
    const { teamId } = req.params as { teamId: string };
    const { team } = await requireTeamAccess(user.id, teamId);
    const q = ListQuery.parse(req.query);
    const cursor = decodeCursor(q.cursor);

    const rows = await prisma.issue.findMany({
      where: {
        teamId,
        deletedAt: null,
        ...(q.stateType ? { state: { type: q.stateType } } : {}),
        ...(q.assigneeId ? { assigneeId: q.assigneeId } : {}),
        ...(q.search ? { title: { contains: q.search, mode: "insensitive" } } : {}),
        // Keyset predicate that matches the (createdAt desc, id desc) ordering.
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: q.limit + 1,
      include: { state: true, assignee: true },
    });

    const hasMore = rows.length > q.limit;
    const items = hasMore ? rows.slice(0, q.limit) : rows;
    const last = items[items.length - 1];
    return {
      items: items.map((i) => serialize(i, team.key)),
      nextCursor:
        hasMore && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
    };
  });

  app.get("/api/v1/issues/:id", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const issue = await prisma.issue.findFirst({
      where: { id, deletedAt: null },
      include: { state: true, assignee: true, team: true },
    });
    if (!issue) throw new AppError(404, "NOT_FOUND", "Issue not found");
    await requireTeamAccess(user.id, issue.teamId);
    return serialize(issue, issue.team.key);
  });

  // PATCH is a true partial update: undefined fields are left untouched; `assigneeId: null` clears.
  app.patch("/api/v1/issues/:id", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const existing = await prisma.issue.findFirst({
      where: { id, deletedAt: null },
      include: { team: true },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Issue not found");
    await requireTeamAccess(user.id, existing.teamId);
    const body = UpdateIssue.parse(req.body);
    const updated = await prisma.issue.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        stateId: body.stateId,
        priority: body.priority,
        assigneeId: body.assigneeId,
      },
      include: { state: true, assignee: true },
    });
    return serialize(updated, existing.team.key);
  });

  // Soft delete — set deletedAt; the row survives (audit/history) and every read filters it out.
  app.delete("/api/v1/issues/:id", async (req, reply) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const existing = await prisma.issue.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Issue not found");
    await requireTeamAccess(user.id, existing.teamId);
    await prisma.issue.update({ where: { id }, data: { deletedAt: new Date() } });
    reply.code(204);
    return null;
  });
}
