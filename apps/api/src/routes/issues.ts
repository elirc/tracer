import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, type Priority, type StateType } from "@tracer/db";
import { keyAfter, keyBetween, FilterNodeSchema } from "@tracer/shared";
import { requireUser, requireTeamAccess } from "../auth/guards";
import { decodeCursor, encodeCursor } from "../lib/pagination";
import { recordMutation } from "../lib/mutations";
import { compileFilter } from "../lib/filter-compile";
import { AppError } from "../errors";

const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATE_TYPES = ["BACKLOG", "UNSTARTED", "STARTED", "DONE", "CANCELED"] as const;

const CreateIssue = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  stateId: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  // Client-generated idempotency key. A resent create (ack lost) carries the same id and must
  // apply exactly once.
  mutationId: z.string().optional(),
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
  // A JSON-encoded filter AST (compiled to a Prisma where; see lib/filter-compile.ts).
  filter: z.string().optional(),
});

interface IssueRow {
  id: string;
  number: number;
  title: string;
  description: string;
  priority: Priority;
  sortOrder: string;
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
    sortOrder: i.sortOrder,
    state: { id: i.state.id, name: i.state.name, type: i.state.type },
    assignee: i.assignee ? { id: i.assignee.id, name: i.assignee.name, email: i.assignee.email } : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

const MoveIssue = z.object({
  stateId: z.string(),
  afterId: z.string().nullable().optional(),
});

export async function issueRoutes(app: FastifyInstance): Promise<void> {
  // Create — the identifier arc. We increment the team counter ATOMICALLY and use the returned
  // value. A read-MAX-then-write would let two concurrent creates land on the same number; the
  // DB serializes this single-row increment for us, gaplessly. (Same shape as invoice numbers
  // in Meridian S9 — recognize it.)
  app.post("/api/v1/teams/:teamId/issues", async (req, reply) => {
    const user = await requireUser(req);
    const { teamId } = req.params as { teamId: string };
    const { team: accessTeam } = await requireTeamAccess(user.id, teamId);
    const body = CreateIssue.parse(req.body);

    // Exactly-once-in-effect: if we've already applied this mutationId, return the existing issue
    // rather than creating a second one. This is the fix for the double-submit / ack-loss arc — a
    // client that resends because it never saw the ack must not end up with two issues.
    if (body.mutationId) {
      const seen = await prisma.mutationLog.findFirst({
        where: { workspaceId: accessTeam.workspaceId, mutationId: body.mutationId },
      });
      if (seen) {
        const existing = await prisma.issue.findFirst({
          where: { id: seen.entityId },
          include: { state: true, assignee: true },
        });
        if (existing) return serialize(existing, accessTeam.key);
      }
    }

    const state = body.stateId
      ? await prisma.workflowState.findFirst({ where: { id: body.stateId, teamId } })
      : await prisma.workflowState.findFirst({ where: { teamId }, orderBy: { position: "asc" } });
    if (!state) throw new AppError(400, "NO_STATE", "team has no workflow state");

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { issueCounter: { increment: 1 } },
    });

    // Append to the bottom of the chosen state's column: a key after the current last one.
    const last = await prisma.issue.findFirst({
      where: { teamId, stateId: state.id, deletedAt: null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
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
        sortOrder: keyAfter(last?.sortOrder ?? null),
      },
      include: { state: true, assignee: true },
    });
    // Record the mutation on the sync spine (log + fanout). REST handlers are now thin wrappers
    // over the write path — the delta is what makes other clients' boards update live.
    const payload = serialize(issue, team.key);
    await recordMutation({
      workspaceId: team.workspaceId,
      teamId,
      entity: "issue",
      entityId: issue.id,
      op: "create",
      data: payload,
      mutationId: body.mutationId,
    });
    reply.code(201);
    return payload;
  });

  // Move — a drag is ONE user intent, so it's ONE mutation: change the state and compute a new
  // sortOrder key BETWEEN the chosen neighbours. Only this row is written; the rest of the column
  // is untouched. The server owns the key so two clients can't invent colliding orders (yet — S07).
  app.patch("/api/v1/issues/:id/move", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const existing = await prisma.issue.findFirst({
      where: { id, deletedAt: null },
      include: { team: true },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Issue not found");
    await requireTeamAccess(user.id, existing.teamId);
    const body = MoveIssue.parse(req.body);

    const siblings = await prisma.issue.findMany({
      where: { teamId: existing.teamId, stateId: body.stateId, deletedAt: null, id: { not: id } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true },
    });

    let loKey: string | null = null;
    let hiKey: string | null = null;
    if (!body.afterId) {
      hiKey = siblings[0]?.sortOrder ?? null; // top of the column
    } else {
      const aIdx = siblings.findIndex((s) => s.id === body.afterId);
      loKey = aIdx >= 0 ? (siblings[aIdx]?.sortOrder ?? null) : null;
      hiKey = aIdx >= 0 ? (siblings[aIdx + 1]?.sortOrder ?? null) : null;
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: { stateId: body.stateId, sortOrder: keyBetween(loKey, hiKey) },
      include: { state: true, assignee: true },
    });
    const payload = serialize(updated, existing.team.key);
    await recordMutation({
      workspaceId: existing.team.workspaceId,
      teamId: existing.teamId,
      entity: "issue",
      entityId: updated.id,
      op: "update",
      data: payload,
    });
    return payload;
  });

  // List — cursor pagination + filters. Soft-deleted rows are excluded (deletedAt: null).
  app.get("/api/v1/teams/:teamId/issues", async (req) => {
    const user = await requireUser(req);
    const { teamId } = req.params as { teamId: string };
    const { team } = await requireTeamAccess(user.id, teamId);
    const q = ListQuery.parse(req.query);
    const cursor = decodeCursor(q.cursor);

    let filterAst = null;
    if (q.filter) {
      try {
        filterAst = FilterNodeSchema.parse(JSON.parse(q.filter));
      } catch {
        throw new AppError(400, "BAD_FILTER", "invalid filter");
      }
    }

    const rows = await prisma.issue.findMany({
      where: {
        AND: [
          { teamId, deletedAt: null },
          ...(q.stateType ? [{ state: { type: q.stateType } }] : []),
          ...(q.assigneeId ? [{ assigneeId: q.assigneeId }] : []),
          ...(q.search ? [{ title: { contains: q.search, mode: "insensitive" as const } }] : []),
          // The compiled filter AST — dual evaluation: the client runs the SAME predicate locally.
          ...(filterAst ? [compileFilter(filterAst)] : []),
          // Keyset predicate matching the (createdAt desc, id desc) ordering.
          ...(cursor
            ? [
                {
                  OR: [
                    { createdAt: { lt: new Date(cursor.createdAt) } },
                    { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
                  ],
                },
              ]
            : []),
        ],
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
    const payload = serialize(updated, existing.team.key);
    await recordMutation({
      workspaceId: existing.team.workspaceId,
      teamId: existing.teamId,
      entity: "issue",
      entityId: updated.id,
      op: "update",
      data: payload,
    });
    return payload;
  });

  // Soft delete — set deletedAt; the row survives (audit/history) and every read filters it out.
  app.delete("/api/v1/issues/:id", async (req, reply) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const existing = await prisma.issue.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Issue not found");
    const { team } = await requireTeamAccess(user.id, existing.teamId);
    await prisma.issue.update({ where: { id }, data: { deletedAt: new Date() } });
    await recordMutation({
      workspaceId: team.workspaceId,
      teamId: existing.teamId,
      entity: "issue",
      entityId: id,
      op: "delete",
      data: null,
    });
    reply.code(204);
    return null;
  });

  // Restore a soft-deleted issue — the undo of delete. It emits an `update` delta so every client
  // that removed the issue on the delete delta adds it back. Undo is just another mutation flowing
  // through the same sync pipeline (the S07 payoff: it syncs, and would work offline).
  app.patch("/api/v1/issues/:id/restore", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const existing = await prisma.issue.findUnique({ where: { id }, include: { team: true } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Issue not found");
    const { team } = await requireTeamAccess(user.id, existing.teamId);
    const restored = await prisma.issue.update({
      where: { id },
      data: { deletedAt: null },
      include: { state: true, assignee: true },
    });
    const payload = serialize(restored, team.key);
    await recordMutation({
      workspaceId: team.workspaceId,
      teamId: existing.teamId,
      entity: "issue",
      entityId: id,
      op: "update",
      data: payload,
    });
    return payload;
  });
}
