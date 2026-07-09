import { prisma, Prisma } from "@tracer/db";
import type { MutationDelta } from "@tracer/shared";
import { fanout } from "./fanout";

interface RecordInput {
  workspaceId: string;
  teamId: string | null;
  entity: string;
  entityId: string;
  op: "create" | "update" | "delete";
  data: unknown; // serialized entity for create/update; null for delete
  clientId?: string;
  mutationId?: string;
}

/**
 * The single write path for the sync spine. It records a mutation as a durable, SEQUENCED fact —
 * the seq is allocated atomically per workspace inside the same transaction — then fans the delta
 * out. Rule to memorize: the log is truth, the fanout is a hint. If a client misses the hint it
 * catches up by replaying from its lastSeq, so a dropped publish is never a lost mutation.
 *
 * We publish AFTER the transaction commits: announcing an uncommitted mutation would let clients
 * see state that then rolls back.
 */
export async function recordMutation(input: RecordInput): Promise<MutationDelta> {
  const seq = await prisma.$transaction(async (tx) => {
    // Atomic per-workspace seq — the same race lesson as issue identifiers, one layer down.
    const ws = await tx.workspace.update({
      where: { id: input.workspaceId },
      data: { mutationSeq: { increment: 1 } },
      select: { mutationSeq: true },
    });
    await tx.mutationLog.create({
      data: {
        workspaceId: input.workspaceId,
        seq: ws.mutationSeq,
        clientId: input.clientId ?? null,
        mutationId: input.mutationId ?? null,
        entity: input.entity,
        entityId: input.entityId,
        op: input.op,
        teamId: input.teamId,
        patch: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    });
    return ws.mutationSeq;
  });

  const delta: MutationDelta = {
    seq,
    entity: input.entity,
    entityId: input.entityId,
    op: input.op,
    teamId: input.teamId,
    mutationId: input.mutationId ?? null,
    data: input.data,
  };
  fanout.publish(input.workspaceId, delta);
  return delta;
}
