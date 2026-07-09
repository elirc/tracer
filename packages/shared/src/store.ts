// The offline-first store model (S07), as pure functions so convergence is unit-testable with no
// IndexedDB and no network. The key idea: NEVER mutate committed truth optimistically. Keep
// server-confirmed state in `committed` and layer un-acked local mutations on top as an overlay.
// Rollback = drop a pending mutation; rebase = recompute the overlay against new committed truth.

export interface Entity {
  id: string;
}

export type Op = "create" | "update" | "delete";

export interface PendingMutation<T extends Entity> {
  mutationId: string; // client-generated; the server dedupes on it (exactly-once-in-effect)
  entityId: string;
  op: Op;
  value?: T; // optimistic value for create/update; ignored for delete
}

export interface StoreState<T extends Entity> {
  committed: Record<string, T>;
  pending: PendingMutation<T>[];
}

export interface ServerDelta<T extends Entity> {
  seq: number;
  op: Op;
  entityId: string;
  value: T | null;
}

export function emptyStore<T extends Entity>(): StoreState<T> {
  return { committed: {}, pending: [] };
}

/** Apply one server delta to committed truth. Idempotent per entity (safe to replay). */
export function applyServerDelta<T extends Entity>(
  committed: Record<string, T>,
  delta: ServerDelta<T>,
): Record<string, T> {
  const next = { ...committed };
  if (delta.op === "delete") delete next[delta.entityId];
  else if (delta.value) next[delta.entityId] = delta.value;
  return next;
}

/** Reduce a batch of deltas to committed state, applied in seq order regardless of arrival order. */
export function reduceDeltas<T extends Entity>(deltas: ServerDelta<T>[]): Record<string, T> {
  let committed: Record<string, T> = {};
  for (const d of [...deltas].sort((a, b) => a.seq - b.seq)) {
    committed = applyServerDelta(committed, d);
  }
  return committed;
}

export function addPending<T extends Entity>(
  state: StoreState<T>,
  m: PendingMutation<T>,
): StoreState<T> {
  return { ...state, pending: [...state.pending, m] };
}

/** Drop a pending mutation once its confirming delta (same mutationId) has hit committed. */
export function ackMutation<T extends Entity>(
  state: StoreState<T>,
  mutationId: string,
): StoreState<T> {
  return { ...state, pending: state.pending.filter((m) => m.mutationId !== mutationId) };
}

/**
 * Materialize the view: committed truth with the pending overlay applied on top, in order. A foreign
 * delta that changes committed is automatically rebased — the overlay re-applies over the new
 * committed value every time we materialize.
 */
export function materialize<T extends Entity>(state: StoreState<T>): T[] {
  const view: Record<string, T> = { ...state.committed };
  for (const m of state.pending) {
    if (m.op === "delete") delete view[m.entityId];
    else if (m.value) view[m.entityId] = m.value;
  }
  return Object.values(view);
}
