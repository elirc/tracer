# Curriculum Note — Sprint 12: Performance & Fractional-Index Rebalancing

## Learning objectives
- Run an **audit-first** performance pass: measure → rank → fix one thing per change → prove.
- Harvest **flaw #2**: bound fractional-index key growth with a rebalance + a metric.

## Key concepts
- **Audit first (`docs/audits/sprint-12-perf.md`).** Findings are ranked by user impact before any
  code changes; each fix carries a before/after number. Guessing at optimizations is how you spend a
  week making the wrong thing 2% faster.
- **Rebalancing (`@tracer/shared/order.ts`, harvest of flaw #2).** Sprint 04 planted unbounded key
  growth (repeated same-slot inserts add a digit each time). `evenKeys(n)` reassigns a column to `n`
  uniform, short, ascending keys; `maxKeyLength` is the metric that says *when*. The rebalance endpoint
  emits ordinary update deltas — so even maintenance flows through the sync engine, and clients
  re-order live. If rebalancing bypassed the log, connected boards would silently disagree.
- **Maintenance is a mutation.** A subtle but important point: the rebalance doesn't reach into the DB
  behind the sync engine's back. It goes through `recordMutation` like a user edit, so every client
  converges on the new order. Offline-safe maintenance is only possible because the write path is the
  only write path.

## Exercise questions
1. Insert 60 issues into the same board slot. Watch `sortOrder` grow. Run the rebalance endpoint —
   how long are the keys now, and why are they uniform?
2. Why does the rebalance emit deltas instead of a bulk `UPDATE` behind the sync engine? What breaks
   for a connected client if it doesn't?
3. The audit ranks findings by *user impact*, not by how interesting the fix is. Which finding here
   would you fix first if you could only do one, and why?

## Deferred (with plan, in the audit doc)
- List/board **virtualization** (flaw #3), server **payload batching**, and the **CI budget gate**
  (Playwright perf spec vs `docs/latency-budget.md`). Each has a concrete plan in the audit.

## Further reading
- Profiling methodology (measure → hypothesize → fix → prove) · Fractional indexing rebalancing
- Windowed rendering (virtualization) · Performance budgets in CI
