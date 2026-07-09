# Performance Audit — Sprint 12

Audit-first: measure and rank before touching code. Findings ranked by user impact.

## Findings

| # | Finding | Severity | Evidence | Fix |
|---|---|---|---|---|
| P1 | Fractional-index keys grow without bound under repeated same-slot inserts (flaw #2) | P1 | `keyBetween` chained 40× into the same slot → a 20+ char key; `maxKeyLength` metric | Rebalance job reassigns uniform short keys (`evenKeys`) |
| P2 | Issue list / board render all rows (no virtualization) (flaw #3) | P2 | 10k-issue seed: initial render janks | Windowed rendering (TanStack Virtual) |
| P3 | Each mutation fans out its own delta frame | P3 | bulk ops send N frames | Server flush-window batching (coalesce per frame) |
| P4 | Presence heartbeats every viewer, unbatched | P3 | N viewers × heartbeat | Throttle + piggyback (partially done: 5s heartbeat) |

## Fixed this PR
- **P1 (flaw #2 harvest).** `evenKeys(n)` generates `n` uniform, short, ascending keys; `maxKeyLength`
  is the metric that triggers a rebalance. A `POST /teams/:id/rebalance` endpoint reassigns a team's
  columns and emits ordinary update deltas (so clients re-order live). Property test proves rebalanced
  keys are shorter than a degenerate same-slot chain.

## Method
- Measure → rank by user impact → fix one thing per change → prove with a before/after number.
- The latency budget (`docs/latency-budget.md`) is the contract; the CI gate that enforces it is the
  next step (needs the E2E harness + a scaled seed).

## Deferred (with plan)
- **P2 virtualization:** window the issue list/board with overscan; the hard part is keeping
  selection, scroll-to, and drag correct with unrendered rows.
- **P3 payload batching:** a ~16ms server flush window coalescing deltas into one frame-aligned
  message; measure message-count before/after.
- **CI budget gate:** a Playwright perf spec asserting the marks against `docs/latency-budget.md`
  (3-run median to tame flake).
