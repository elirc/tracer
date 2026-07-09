# Sprint 10 — Views, Filters & Cycles

**Branch:** `sprint-10/views-filters-cycles` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Generalize S5's canned views into a filter AST evaluated in *two places* — server-side for bootstrap, client-side against the local store for instant results — plus saved views and time-boxed cycles with auto-rollover.

## A — Issues
1. `Filter AST: typed predicate tree (and/or/not; field operators) in packages/shared`
2. `Dual evaluation: SQL compiler (server) + store evaluator (client) with equivalence tests`
3. `Filter bar UI + saved views (synced entities) + display config (grouping, ordering)`
4. `Cycles: time-boxed iterations, issue assignment, auto-rollover job`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(shared): filter AST — zod-typed predicate tree + serialization` | `{op:'and', children:[{field:'state.type', cmp:'in', value:[...]}, …]}` |
| 2 | `feat(shared): client evaluator — AST → predicate over store entities` | pure, property-tested |
| 3 | `feat(api): SQL compiler — AST → parameterized Prisma/SQL where-clause` | ⚠️ injection surface: fields are an allowlist enum, never strings from the client |
| 4 | `test(shared): equivalence property — client eval ≡ server eval on random ASTs + fixtures` | the sprint's crown test: generate ASTs with fast-check, run both engines, compare result sets |
| 5 | `refactor(web): My Issues / Active / Backlog become saved ASTs` | rule-of-three payoff, S5's timer rings; canned views delete their bespoke handlers |
| 6 | `feat(web): filter bar — chips, keyboard-driven (f then field), palette integration` | |
| 7 | `feat(db+web): SavedView as synced entity — AST + display config (group by, order by)` | views sync across devices via S7 store, naturally |
| 8 | `feat(db+api): Cycle model — start/end, team cadence config, issue.cycleId` | |
| 9 | `feat(api): cycle rollover job — close cycle, move unfinished issues to next (BullMQ repeatable)` | rollover writes go through applyMutation → clients see it live; job idempotent per cycle |
| 10 | `feat(web): cycle views — current/upcoming, progress bar, velocity-lite` | |
| 11 | `test(api+e2e): rollover idempotency; saved view roundtrip; filter bar e2e` | |
| 12 | `docs: ADR-0009 dual-evaluation filters; curriculum note` | |

## C — Review order
AST types (1) → both evaluators (2–3) → the equivalence test (4) — then everything else is consumers.

## D — Teaching comments (~10)
- AST over query strings — 📘 filters as data: serializable (saved views), analyzable (which fields need indexes), compilable to two targets
- field allowlist — ⚠️ compiling client input to SQL is an injection factory unless fields/operators are closed enums; the zod schema is the security boundary
- equivalence property — 📘 two implementations of one spec drift unless a test forces them together; this is how you keep client and server honest forever
- canned-views refactor — 🔍 review-lens: the S5 comment said "rule-of-three timer starts" — it just rang; deleting bespoke code is the reward
- views as synced entities — 🔗 third feature (after comments, notifications) that cost no new infrastructure; count what the spine has paid for
- rollover through applyMutation — 📘 jobs are just another client of the write path; if the rollover bypassed the log, connected boards would silently disagree
- velocity-lite — ⚠️ aggregate over the *store* client-side for the current cycle; historical aggregates stay server-side — know which side owns which math

## E — Debate
**"Evaluate filters client-side at all, or always ask the server?"** Server-only: one engine, one truth. Client: instant (<16ms) filter changes over the local store, works offline — the product feel *is* the point. **Resolution:** dual with the equivalence test as the safety net; server remains truth for bootstrap and large teams. → ADR-0009. Lesson: *duplicating logic is sometimes right — if you build the test that makes the duplication safe.*

## F/G — Close
- Squash: `feat(sprint-10): filter AST, saved views, cycles (closes #…)`
- Deferred: swimlane custom grouping, cycle burndown charts, view sharing permissions.
- Recap idea: *turn features into data (ASTs, view configs) and the sync engine distributes them for free.*
