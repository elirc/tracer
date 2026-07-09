# Sprint 12 — Performance: Virtualization, Payloads & Budget Enforcement

**Branch:** `sprint-12/performance` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** The latency budget becomes law. Audit-first (S13-style, applied to perf only): profile with a 10k-issue seed, then virtualize lists/boards, batch sync payloads, throttle presence, rebalance fractional indexes — every fix with before/after numbers. Three ledger flaws harvested.

## A — Issues
1. `Perf audit vs latency-budget.md at 10k issues (findings doc first)`
2. `Virtualize list + board (TanStack Virtual)`
3. `Sync payload batching + delta compression`
4. `Presence throttling/batching`
5. `Fractional-index rebalancing + key-length metric`
6. `Budget CI gate`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(db): seed --scale=10k + perf fixture workspace` | the conveniently-small seed (S5) ends; numbers get honest |
| 2 | `docs: perf audit — findings vs budget, ranked (P1..P3)` | measured via S5 perf marks + React profiler + WS message counts; quotes budget doc line by line |
| 3 | `perf(web): virtualize issue lists (P1)` | **harvests flaw #3**; before/after: 10k rows 1400ms → 45ms initial render; scroll jank gone |
| 4 | `perf(web): virtualize board columns (P1)` | dnd-kit + virtualization interplay — the hard part, documented |
| 5 | `perf(api): sync payload batching — coalesce deltas per flush window (P1)` | 16ms server-side flush window; N mutations → 1 frame-aligned message |
| 6 | `perf(web): store batch-apply — one subscription notification per batch (P2)` | render count per bulk-op: 500 → 1 |
| 7 | `perf(api): presence throttle + batch (P2)` | **harvests flaw #5**; heartbeat 2s→15s + piggyback on activity; WS msg volume −85% |
| 8 | `perf(shared): fractional-index rebalancing job + key-length metric (P2)` | **harvests flaw #2**; rebalance emits ordinary mutations (spine!); metric alerts at p95 key length |
| 9 | `perf(web): palette open <50ms — provider laziness, memo audit (P3)` | React profiler screenshots in body |
| 10 | `ci: latency budget gate — playwright perf spec asserts marks against budget` | budget regressions now fail CI; flake mitigation documented (3-run median) |
| 11 | `docs: curriculum note — "run this audit yourself" checklist` | |

## C — Review order
Audit doc (2) first, always → each fix against its finding → the CI gate (10).

## D — Teaching comments (~10)
- audit-first — 🔗 Meridian S13's methodology, scoped to perf; measure → rank → fix-one-per-commit → prove
- virtualization — 📘 windowing: render what's visible plus overscan; why DOM node count, not React, was the bottleneck (profiler evidence)
- virtual + dnd — ⚠️ dragging into an unrendered region; the placeholder strategy
- flush window — 📘 latency/throughput knob: 16ms batches cost one frame, save N-1 messages; where NOT to batch (user's own ack)
- batch-apply — 🔍 review-lens: notify-per-entity was invisible at 500 issues; always ask "at 100×?"
- rebalancing via mutations — 🔗 even maintenance flows through the log — otherwise offline clients diverge; the flaw ledger quote and why silence was the lesson
- perf CI flake — ⚠️ perf tests flake by nature; medians, generous margins, and separating "budget" (hard fail) from "regression watch" (warn)

## E — Debate
**"Delta compression: JSON patch minimization vs binary encoding (msgpack)?"** Binary: smaller, opaque. Minimized JSON: readable in devtools, compresses well under permessage-deflate anyway. **Resolution:** minimized JSON + WS compression; measure first — the audit showed message *count*, not size, was the cost. Lesson: *optimize the measured bottleneck, not the impressive one.*

## F/G — Close
- Squash: `perf(sprint-12): virtualization, payload batching, budget enforcement (closes #…)`
- **Lab:** `lab/sprint-12` — a branch with a re-render storm (context misuse), an unbatched hot path, and an unvirtualized new view; find via profiler + marks.
- Ledger: flaws #2, #3, #5 closed.
- Recap idea: *performance is a budget you enforce, not a sprint you schedule — the CI gate is the actual deliverable.*
