# ADR-0006: An LWW mutation log for real-time sync (not CRDTs)

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S06
- **Deciders:** Tracer authors

## Context
Sprint 06 replaces the invalidate-everything client (flaw #1) with real-time sync. Two clients edit
the same workspace; changes must appear on every screen live, survive reconnects, and stay
consistent. The two mainstream models are a **server-ordered mutation log** (per-field
last-write-wins) and **CRDTs** (conflict-free replicated data types that converge without a server).

## Decision
We use a **server-ordered mutation log with per-field LWW**. Every issue-domain write goes through
one write path (`recordMutation`) that assigns a monotonic per-workspace `seq`, records the mutation
as a durable fact, and fans the delta out. Clients bootstrap from their `lastSeq` and then receive
live deltas. **The log is truth; the fanout is a hint** — a client that misses a delta replays from
its `lastSeq`.

## Alternatives considered
- **CRDTs.** Automatic convergence, no central arbiter, great for *collaborative text* where two
  people type in the same paragraph. Rejected here: issue metadata (title, state, assignee) is
  field-granular, where "last edit wins" matches user intent, and CRDTs' metadata overhead and
  complexity aren't justified. (CRDTs are the right tool for a different product — the collaborative
  editor in Course 6 — and we build them there.)

## Consequences
- A total order (`seq`) gives us free, correct ordering and a natural audit trail.
- The server arbitrates, so two clients can't diverge — but offline editing (Sprint 07) needs the
  client to apply mutations optimistically and rebase on the server's order.
- **Fanout transport:** in-process now (single instance). Multi-instance needs a shared bus so a
  mutation on instance A reaches a client on instance B — Redis pub/sub, a drop-in implementation of
  the same `Fanout` interface. The interface is the seam; swapping the transport touches no callers.
- **Flaw #4 (planted):** channel authorization is workspace-coarse — a guest subscribed to a
  workspace receives deltas for teams they can't read. The delta carries `teamId`; Sprint 13 adds
  per-team channel authz.

## Links
- `apps/api/src/lib/mutations.ts`, `apps/api/src/ws.ts`, `apps/api/src/lib/fanout.ts`
- `packages/shared/src/sync.ts`, `docs/sync-protocol.md`, `docs/sprints/sprint-06.md`
