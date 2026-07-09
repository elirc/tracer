# ADR-0004: Cursor pagination as the list contract

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S03
- **Deciders:** Tracer authors

## Context
Every list endpoint (issues now; notifications, activity, search later) needs pagination. The two
options are OFFSET/LIMIT (page numbers) and keyset/cursor (opaque "after this row").

## Decision
All list endpoints use **cursor pagination**. The server encodes the sort key of the last row
(`createdAt` + `id`) into an opaque base64url cursor the client echoes back. The list is ordered
`(createdAt desc, id desc)` and the keyset predicate matches that ordering exactly.

## Alternatives considered
- **OFFSET/LIMIT.** Familiar page numbers. Rejected on two counts: (1) correctness — under
  concurrent inserts/deletes, OFFSET skips or repeats rows across pages (an issue tracker is
  constantly mutating); (2) performance — the database must scan and discard `OFFSET` rows, which
  is O(n) and degrades as you page deeper. Cursor pagination is stable under writes and stays
  O(log n) via the index.

## Consequences
- Clients get "next page" via an opaque token, not arbitrary page jumps (acceptable — Tracer's
  lists are infinite-scroll, not numbered pages).
- The cursor + ordering + index must stay in sync; the tie-breaker `id` is mandatory or rows with
  equal `createdAt` can be skipped.
- A reusable helper (`apps/api/src/lib/pagination.ts`) encodes the contract once; it's pure and
  unit-tested so every endpoint inherits the same guarantees.

## Links
- `apps/api/src/lib/pagination.ts` (+ test), `apps/api/src/routes/issues.ts`, `docs/sprints/sprint-03.md`
