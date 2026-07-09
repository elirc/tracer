# ADR-0007: The committed/pending overlay store (offline-first client)

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S07
- **Deciders:** Tracer authors

## Context
Sprint 07 makes the client offline-first: it must boot without the network, apply local edits
instantly (optimistically), send them when connected, and reconcile with the server's authoritative
order — all without losing the user's work or showing duplicates.

## Decision
The client keeps two layers:
- **`committed`** — server-confirmed truth (a map by entity id), updated only by server deltas.
- **`pending`** — un-acked local mutations, each with a client-generated `mutationId`.

The view is **`materialize(committed, pending)`**: committed truth with the pending overlay applied
on top. **We never mutate committed optimistically.** Rollback = drop a pending mutation; rebase =
re-materialize over new committed (automatic every render). A server delta whose `mutationId`
matches a pending one **acks** it (drops it from pending). The state lives in IndexedDB, so the app
boots from disk before the network.

## Alternatives considered
- **Mutate a single state tree optimistically, then patch it back on server response.** Simpler at
  first, but rollback and rebase become ad-hoc "undo my guess" logic that gets the concurrent-edit
  cases wrong (a foreign edit arriving between your optimistic change and its ack). The overlay makes
  rollback and rebase fall out of one data structure.

## Consequences
- Optimistic UI is free: the overlay shows the change instantly; the ack removes it once committed.
- **Exactly-once-in-effect:** the client sends a `mutationId`; the server dedupes, so a resent
  create (ack lost) applies once. Delta application stays idempotent, so replay on reconnect is safe.
- The overlay model is pure (`@tracer/shared/store.ts`), so convergence is a **property test**: the
  same deltas in any arrival order reduce (in seq order) to identical committed state.
- Server order is authoritative; a client's optimistic value is replaced by the server's on ack
  (per-field LWW). Conflicting concurrent edits resolve to the higher seq.

## Links
- `packages/shared/src/store.ts` (+ property tests), `apps/web/src/lib/useTeamIssues.ts`,
  `apps/web/src/lib/idb.ts`, `apps/api/src/routes/issues.ts` (dedupe), `docs/sprints/sprint-07.md`
