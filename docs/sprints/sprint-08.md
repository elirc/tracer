# Sprint 08 — Undo/Redo & Optimistic UX (Dialogue Format)

**Branch:** `sprint-08/undo-optimistic-ux` · **Size:** M/L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Reinforcement sprint in junior/senior dialogue format — **the learner co-authors the junior commits** (their first authored code in the course). Command pattern with inverse mutations, a real undo/redo stack, bulk multi-select operations, and undo-toasts.

## A — Issues
1. `Command layer: every user action = command with inverse`
2. `Undo/redo stack (Cmd+Z / Cmd+Shift+Z) spanning issue mutations`
3. `Multi-select + bulk operations (state, assignee, label, delete)`
4. `Undo-toasts ("Deleted ENG-123 — Undo")`

## B — Commits (dialogue pairs; J = learner-authored junior pass, S = AI senior review pass)
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(web): undo — [J] snapshot-based (store whole issue before edit, restore on undo)` | works; heavy, breaks under concurrent foreign edits (restores stale fields) |
| 2 | `refactor(web): undo — [S] inverse mutations` | undo of `set(title, B, was A)` is `set(title, A)` — flows through the same sync pipeline, LWW-safe; body reviews J point by point, kindly |
| 3 | `feat(web): undo/redo stack — [J] global array + keybindings` | redo cleared on new action? not handled; undoing others' changes? possible |
| 4 | `refactor(web): stack semantics — [S] per-user scope, redo invalidation, coalescing rapid edits` | typing coalescing window; you can only undo *your own* mutations — 📘 collaborative undo semantics |
| 5 | `feat(web): multi-select — [J] shift-click + x key, bulk = loop of single mutations` | 500 issues selected = 500 mutations = 500 deltas to every client |
| 6 | `refactor(api+web): bulk mutation type — [S] one mutation, N entity patches, one seq` | protocol extension: batch mutations; inverse of a batch is a batch |
| 7 | `feat(web): undo-toasts for destructive actions` | delete is a soft-delete mutation with an inverse — "Undo" is just undo |
| 8 | `test(store): undo/redo properties — undo(do(x)) is identity under no interference; coalescing` | |
| 9 | `test(e2e): bulk change 50 issues → single undo restores all; toast-undo on delete` | |
| 10 | `docs: curriculum note — includes the learner's own retro on their J commits` | new artifact: the learner writes what they'd review differently now |

## C — Review order
Read each J commit and *write your review before reading the S commit* — this sprint is the review-before-reveal exercise squared.

## D — Teaching comments (~10)
- snapshot vs inverse — 📘 the core distinction: snapshots restore *state* (clobbering concurrent edits); inverses restore *intent* (composing with them)
- undo through the pipeline — 🔗 because undo is just a mutation, it syncs, persists offline, and dedupes for free — the S7 architecture paying rent
- collaborative undo scope — 📘 undoing someone else's edit is an act of aggression; per-user stacks are a product decision encoded in data structures
- coalescing — ⚠️ per-keystroke undo is unusable; the timing-window tradeoff
- batch mutation — 📘 protocol evolution: adding a message type without breaking old clients (version field earns its keep)
- bulk fanout math — 🔍 review-lens: always multiply — selections × mutations × connected clients; J's loop was O(n) user-visible lag

## E — Debate
**"Should redo survive a foreign edit to the same field?"** Yes: user pressed the keys. No: redo would clobber something they've now seen. **Resolution:** redo drops silently if its target field changed since — losing a redo is confusing for a second; losing a colleague's edit is trust-destroying. Lesson: *in collaboration, bias toward preserving others' work.*

## F/G — Close
- Squash: `feat(sprint-08): undo/redo, bulk ops, optimistic UX (closes #…)`
- Deferred: cross-entity transactional undo (move+rename as one step), selection persistence.
- Recap idea: *undo is the acid test of your mutation model — if undo is hard, the model is wrong.*
