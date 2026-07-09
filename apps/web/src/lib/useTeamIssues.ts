import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyServerDelta,
  addPending,
  ackMutation,
  emptyStore,
  materialize,
  type MutationDelta,
  type StoreState,
} from "@tracer/shared";
import { apiGet, apiPost } from "./api";
import { idbGet, idbSet } from "./idb";
import { useSync } from "./sync";

export interface IssueDTO {
  id: string;
  identifier: string;
  title: string;
  priority: string;
  sortOrder: string;
  state: { id: string; name: string; type: string };
  assignee: { name: string | null } | null;
}

interface Cached {
  committed: Record<string, IssueDTO>;
  lastSeq: number;
}

/**
 * The offline-first issue store for a team (S07). It boots from IndexedDB (disk before network),
 * keeps server-confirmed truth in `committed`, and overlays un-acked local mutations. `createIssue`
 * applies optimistically (a pending overlay shown instantly), sends a client `mutationId` so the
 * server dedupes on retry, then reconciles. Deltas patch `committed` and ack the matching pending.
 */
export function useTeamIssues(teamId: string): {
  issues: IssueDTO[];
  createIssue: (title: string) => Promise<void>;
} {
  const [state, setState] = useState<StoreState<IssueDTO>>(emptyStore());
  const lastSeqRef = useRef(0);
  const { onDelta } = useSync();

  const cacheKey = `issues:${teamId}`;

  // Boot from disk, then hydrate from the server. The disk copy makes the list appear instantly,
  // even offline; the server fetch reconciles it.
  useEffect(() => {
    let active = true;
    void idbGet<Cached>(cacheKey).then((cached) => {
      if (active && cached) {
        lastSeqRef.current = cached.lastSeq;
        setState((s) => ({ ...s, committed: cached.committed }));
      }
    });
    void apiGet<{ items: IssueDTO[] }>(`/api/v1/teams/${teamId}/issues?limit=100`).then((r) => {
      if (!active) return;
      const committed: Record<string, IssueDTO> = {};
      for (const i of r.items) committed[i.id] = i;
      setState((s) => ({ ...s, committed }));
    });
    return () => {
      active = false;
    };
  }, [teamId, cacheKey]);

  // Live deltas: patch committed truth, ack our own pending, persist to disk.
  useEffect(
    () =>
      onDelta((delta: MutationDelta) => {
        if (delta.entity !== "issue" || delta.teamId !== teamId) return;
        lastSeqRef.current = Math.max(lastSeqRef.current, delta.seq);
        setState((s) => {
          const committed = applyServerDelta(s.committed, {
            seq: delta.seq,
            op: delta.op,
            entityId: delta.entityId,
            value: (delta.data as IssueDTO | null) ?? null,
          });
          const pending = delta.mutationId
            ? s.pending.filter((m) => m.mutationId !== delta.mutationId)
            : s.pending;
          void idbSet<Cached>(cacheKey, { committed, lastSeq: lastSeqRef.current });
          return { committed, pending };
        });
      }),
    [onDelta, teamId, cacheKey],
  );

  const createIssue = useCallback(
    async (title: string) => {
      const mutationId = crypto.randomUUID();
      const tmpId = `tmp_${mutationId}`;
      // Optimistic: overlay a placeholder immediately (feels instant; works offline).
      setState((s) =>
        addPending(s, {
          mutationId,
          entityId: tmpId,
          op: "create",
          value: {
            id: tmpId,
            identifier: "…",
            title,
            priority: "NONE",
            sortOrder: "~", // sorts last
            state: { id: "", name: "…", type: "" },
            assignee: null,
          },
        }),
      );
      try {
        const created = await apiPost<IssueDTO>(`/api/v1/teams/${teamId}/issues`, { title, mutationId });
        // Reconcile: real issue into committed, drop the temp pending. (The live delta is
        // idempotent, so it re-setting committed[created.id] is a no-op.)
        setState((s) => ({
          committed: { ...s.committed, [created.id]: created },
          pending: ackMutation(s, mutationId).pending,
        }));
      } catch {
        setState((s) => ackMutation(s, mutationId)); // rollback the optimistic overlay
      }
    },
    [teamId],
  );

  return { issues: materialize(state), createIssue };
}
