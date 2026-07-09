# Sprint 04 — Board, Ordering & Keyboard v1

**Branch:** `sprint-04/board-keyboard` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** The kanban board with drag-and-drop, ordered collections via fractional indexing, and the keyboard system: a global shortcut registry and command palette v1. The sprint where "keyboard-driven UX" becomes architecture, not garnish.

## A — Issues
1. `Kanban board grouped by workflow state, drag-and-drop (dnd-kit)`
2. `Issue ordering: fractional indexing (sortOrder)`
3. `Global keyboard shortcut registry + contextual scopes`
4. `Command palette v1 (create issue, jump to team, change state/assignee/priority)`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(shared): fractional-index util — keyBetween(a, b)` | base-62 midpoint strings; **[flaw #2]** no rebalancing — repeated same-slot inserts grow keys unboundedly (harvest S12) |
| 2 | `test(shared): property tests — ordering invariants (between, prepend, append)` | fast-check; the *growth* property is conspicuously untested — silence is the plant |
| 3 | `feat(db): issue.sortOrder + backfill migration for seeded issues` | expand/backfill pattern, fast-forwarded |
| 4 | `feat(api): move endpoint — state change + reorder in one mutation` | payload: `{stateId, afterIssueId?}`; server computes the key — client never invents order keys… yet (🔗 S7 changes this, deliberately) |
| 5 | `feat(web): board view — columns by state, dnd-kit drag with optimistic move` | rollback on failure; drop animation |
| 6 | `feat(web): keyboard registry — scopes (global/list/board/detail), chord support (g+i)` | one registry, declarative bindings, help overlay (?) generated from it |
| 7 | `feat(web): command palette v1 — fuzzy match over static actions + context actions` | portal, focus trap, recents |
| 8 | `feat(web): board keyboard mode — arrows move focus, space lifts/drops card` | keyboard parity with drag — 🔗 formalized for a11y in S14 |
| 9 | `test(e2e): drag reorder persists; keyboard-only board move; palette create-issue` | |
| 10 | `docs: ADR-0004 fractional indexing; curriculum note` | |

## C — Review order
`keyBetween` + its property tests → move endpoint (4) → keyboard registry (6) → palette (7).

## D — Teaching comments (~10)
- keyBetween — 📘 the midpoint-string idea from first principles; why floats fail (precision exhaustion ~50 splits); base-62 alphabet choice
- property tests — 🔍 review-lens: what properties are asserted — and ask yourself what's *missing* (exercise question in curriculum note foreshadows S12)
- move-as-one-mutation — 📘 a drag is one user intent = one mutation; two calls would tear under failure
- server-computed key — ⚠️ two clients inserting at the same slot get colliding keys; server arbitration hides this *for now* — 🔗 S7 must solve it client-side, and S6's seq ordering is the enabler
- shortcut scopes — 📘 shortcut conflicts are a namespace problem; scope stack mirrors focus; why `?` help must be generated, never hand-listed
- palette recents — 📘 frecency beats recency (🔗 ranked properly in S11)
- optimistic drag — ⚠️ rollback must restore *position*, not just refetch — the user watched the card land

## E — Debate
**"Fractional indexing vs integer resequencing?"** Integers: readable, but a move rewrites N rows (and N sync deltas — foreshadowing). Fractional: one row per move, merge-friendly offline. **Resolution:** fractional — the sync engine decides this debate before it exists; a move must be a single-row delta. → ADR-0004.

## F/G — Close
- Squash: `feat(sprint-04): board, fractional ordering, keyboard system (closes #…)`
- **Lab:** `lab/sprint-04` — three bugs: a shortcut leaking across scopes, an optimistic move that doesn't roll back, a `keyBetween` edge case (prepend before first key).
- Ledger: flaw #2 recorded.
- Recap idea: *ordering is data design; keyboards are an architecture — both decided here for the next 11 sprints.*
