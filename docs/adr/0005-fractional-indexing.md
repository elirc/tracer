# ADR-0005: Fractional indexing for ordered collections

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S04
- **Deciders:** Tracer authors

## Context
Issues on a board are ordered, and users drag them to reorder. We need a way to represent "issue X
comes between Y and Z" that a single reorder can update cheaply — and that will merge cleanly once
the sync engine (S06–07) lets two clients reorder concurrently.

## Decision
Each issue carries a **fractional-index key** (`sortOrder`, a base-62 string). To move an issue we
compute a key strictly **between** its new neighbours (`keyBetween`, `@tracer/shared/order.ts`).
Only the moved row is written.

## Alternatives considered
- **Integer positions with resequencing.** Readable, but moving an issue to the top requires
  rewriting the position of every row below it — O(n) writes per move, and O(n) sync deltas once
  real-time lands. A drag should be one row's change, not the whole column's.
- **A floating-point position.** Simple midpoints, but doubles run out of precision after ~50
  same-slot inserts; a string key can grow to preserve order indefinitely.

## Consequences
- A move is a single-row update and a single (future) sync delta — merge-friendly.
- **Known flaw (#2):** keys grow in length without bound when you repeatedly insert between the same
  two neighbours. Fine at product scale; a rebalancing pass + a key-length metric land in Sprint 12.
- The server currently computes the key, so two clients can't yet collide on order. Sprint 07 moves
  key generation to the client (offline reorders) and resolves collisions via the sync engine.

## Links
- `packages/shared/src/order.ts` (+ property tests), `apps/api/src/routes/issues.ts` (move endpoint)
