# Tracer Flaw Ledger (revealed publicly at v1.0 — see docs/COURSE-RETROSPECTIVE.md)

| # | Planted in | What | Where | Harvested in | Status |
|---|-----------|------|-------|--------------|--------|
| 1 | S03 | Issue list refetches whole collection on every mutation (invalidate-everything) | web query layer | S06–S07 (sync engine makes it moot; named in migration ADR) | harvested ✓ |
| 2 | S04 | Fractional indexing with no rebalancing — sortOrder strings grow unboundedly under repeated same-slot inserts | shared ordering util | S12 (rebalancing job + length metric) | harvested ✓ |
| 3 | S05 | Board renders all issues — no virtualization | board view | S12 (TanStack Virtual + budget CI) | harvested ✓ |
| 4 | S06 | Sync channel authz is workspace-coarse — guests receive deltas for teams they can't read | WS gateway subscribe | S13 (per-team channel authz + leak test) | harvested ✓ |
| 5 | S09 | Presence heartbeat every 2s per client, unbatched | presence module | S12 (throttle+batch) and S13 load evidence | harvested ✓ |

**In-PR arcs (planted and fixed inside one PR by design):**
S02 OAuth `state` missing → login CSRF test → fix · S03 identifier counter race → `SELECT FOR UPDATE` · S06 concurrent seq assignment race → failing test → tx serialization · S07 duplicate mutation delivery → client-generated mutationId dedupe.

**Rules:** never fix a ledger flaw silently; harvesting commits quote the ledger row and flip Status.
