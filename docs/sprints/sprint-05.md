# Sprint 05 — Views, E2E, Deploy → v0.5.0

**Branch:** `sprint-05/mvp-ship` · **Size:** M · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Ship the classic-architecture MVP: My Issues + team views, demo seed, consolidated E2E, Dockerized auto-deploy — and the **latency budget** document that becomes a CI-enforced contract in S12.

## A — Issues
1. `My Issues view + team active/backlog views`
2. `UX pass: empty/error states, toasts, 404, loading skeletons (fast-forward)`
3. `Demo seed + consolidated Playwright suite (incl. keyboard-only journey)`
4. `Docker + deploy + health/ready + auto-deploy on merge`
5. `docs/latency-budget.md — the interaction performance contract`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(web): My Issues (assigned/created), team Active + Backlog views` | |
| 2 | `feat(web): ux pass — states, toasts, skeletons (fast-forward)` | **[flaw #3]** board and lists render all rows, no virtualization — fine at 500 issues, seed stays conveniently small (harvest S12) |
| 3 | `feat(db): demo seed — workspace, 3 teams, 800 issues, labels, projects` | |
| 4 | `test(e2e): consolidated suite + keyboard-only journey (create→move→close issue, no mouse)` | keyboard-only E2E is the course's signature test |
| 5 | `ci: e2e with postgres service container (fast-forward)` | |
| 6 | `feat: dockerfiles + /ready + deploy workflow (fast-forward from Meridian S5)` | |
| 7 | `docs: latency-budget.md — keyboard action→paint <100ms, route change <200ms, palette open <50ms` | how each is measured (Performance API marks); budgets are aspirational until S12 enforces them |
| 8 | `feat(web): perf marks — instrument palette open, issue move, route change` | measurement before optimization; marks flow to console in dev |
| 9 | `docs: ADR-0005 hosting; README; curriculum note` | |

## C — Review order
Latency budget doc (7) + perf marks (8) first — the contract matters more than the views → keyboard-only E2E (4) → the rest is fast-forward.

## D — Teaching comments (~8)
- latency-budget doc — 📘 performance as a written contract with numbers and measurement method — not a vibe; 🔗 S12 turns it into a CI gate
- perf marks — 📘 instrument first, optimize later (S12); `performance.mark/measure` and why devtools timings lie less than `Date.now`
- keyboard-only E2E — 🔍 review-lens: this test is the product thesis; if it breaks, Tracer stopped being Tracer
- views as queries — 📘 My Issues / Active / Backlog are canned filters — 🔗 S10 generalizes them into a filter AST; note how similar these three handlers look (rule-of-three timer starts)
- seed size — ⚠️ *(no comment — the conveniently small seed hides flaw #3; silence is the plant)*

## E — Debate
**"Instrument performance now or when it hurts?"** Later: YAGNI. Now: you can't fix what you didn't measure, and budgets without baselines are fiction; marks cost ~nothing. **Resolution:** now — 20 lines of marks buys S12 its before/after evidence. Lesson: *observability is cheapest at birth.*

## F/G — Close
- Squash: `feat(sprint-05): MVP — views, e2e, deploy (closes #…)`
- **Post-merge:** deploy → demo script on live URL → tag **`v0.5.0`** → MVP retro discussion.
- Ledger: flaw #3 recorded.
- Recap idea: *Phase 1 shipped a good classic app; Phase 2 makes it a Linear-class one — reread ADR-0002 tonight.*
