# Sprint 03 — Issues Core: The Deliberate "Classic" Architecture

**Branch:** `sprint-03/issues-classic` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** The issue domain built as a textbook REST + TanStack Query app — deliberately the "before" picture that S6–S7 will replace. Fast-forward on CRUD craft; new material: team-scoped identifiers (`ENG-123`), workflow states as data, and an honest look at where the classic architecture already creaks.

## A — Issues
1. `Issue, WorkflowState, Label, Project models; per-team identifier sequence`
2. `Issues REST API (fast-forward: cursor pagination, filters, soft delete, audit)`
3. `Issue list + detail + inline editors (title, state, assignee, priority, labels)`
4. `Default workflow states per team; state ordering`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(db): Issue, WorkflowState, Label, Project + team identifier counter` | states are rows (ordered, typed backlog/unstarted/started/done/canceled), not an enum — teams customize them |
| 2 | `feat(api): identifier generation ENG-123 — [naive MAX+1]` | **[fix-later-in-PR]** |
| 3 | `test(api): concurrent issue creation → duplicate identifiers, FAILS` | Meridian S9's lesson resurfaces — does the learner recognize it before reading the fix? |
| 4 | `fix(api): counter row + SELECT FOR UPDATE` | commit body: "we solved this in Meridian S9; same shape, new domain" |
| 5 | `feat(api): issues REST — list/create/get/patch/delete (fast-forward)` | teamScope() on every query |
| 6 | `feat(web): issue list per team — filters, keyboard row focus (j/k)` | first keyboard affordance; j/k/enter/esc conventions |
| 7 | `feat(web): issue detail panel — inline editors, every field a small mutation` | |
| 8 | `feat(web): workflow state management UI (reorder, rename, colors)` | |
| 9 | `feat(web): mutation layer — invalidate-everything on issue change` | **[flaw #1]** simple and correct, wasteful and visibly laggy; a teaching comment *does* flag this one — it's the announced "before" architecture, not a hidden flaw |
| 10 | `feat(db): seed — demo workspace, 3 teams, 500 issues` | |
| 11 | `test(api+e2e): crud, identifier, guest-scoping, list e2e` | |
| 12 | `docs: curriculum note sprint 03` | includes "measure it yourself": network tab exercise counting refetches per edit |

## C — Review order
Identifier arc (2→3→4) → the mutation layer (9) *with ADR-0002 open beside it* → keyboard list (6).

## D — Teaching comments (~10)
- states as rows — 📘 configuration vs code: when an enum must become data; ordering column (🔗 fractional indexing arrives in S4)
- identifier arc — 🔍 review-lens: pattern recognition test; same bug class as Meridian invoices — spot it in commit 2 before reading 3
- invalidate-everything — 📘 *announced flaw*: correct-but-crude cache strategy; count the refetches; this line is why S6 exists; 🔗 ADR-0002
- inline editors — 📘 every field is its own mutation: small payloads now, and exactly the mutation granularity the sync engine will need — the migration was planned this far back
- j/k focus — 📘 keyboard UX starts with focus management, not shortcuts; roving focus in a list
- optimistic title edit — ⚠️ the flash-of-old-value bug; TanStack `onMutate` rollback pattern (fast-forward from Meridian S6)

## E — Debate
**"Custom workflow states per team vs fixed global states?"** Fixed: simpler queries, cross-team consistency. Custom: real teams have real processes; state *type* (started/done…) gives queries a stable spine under custom names. **Resolution:** custom rows + fixed `type` column — the type is the API, the name is the label. Lesson: *separate identity from presentation in domain modeling.*

## F/G — Close
- Squash: `feat(sprint-03): issues core — classic architecture (closes #…)`
- Deferred: sub-issues, issue relations, bulk edit (→ S8).
- Ledger: flaw #1 recorded (announced variant).
- Recap idea: *we shipped a good 2015 architecture on purpose — feel its weight before S6 removes it.*
