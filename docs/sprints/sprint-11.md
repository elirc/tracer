# Sprint 11 — Search & Command Palette v2

**Branch:** `sprint-11/search-palette` · **Size:** M/L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Hybrid search — instant local fuzzy search over the store, backed by server-side Postgres FTS for cold/large corpora — unified in command palette v2 with actions, context, and frecency ranking.

## A — Issues
1. `Local search: fuzzy index over store entities (titles, identifiers)`
2. `Server search: Postgres FTS (title+description), highlighted snippets`
3. `Palette v2: unified results (issues, actions, navigation), context-aware, frecency-ranked`
4. `Quick-open (Cmd+K / Cmd+P semantics), recent items`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(web): local fuzzy matcher — subsequence scoring, identifier fast-path (ENG-123 exact)` | hand-rolled ~80-line scorer; commit body explains why not a library (bundle + teaching) |
| 2 | `feat(web): incremental local index — updates via store subscriptions, not rebuilds` | index maintenance on entity change; memory bound documented |
| 3 | `feat(db): tsvector column + GIN index on issues (title, description)` | generated column; weighting title > description |
| 4 | `feat(api): /search — FTS query, rank, headline snippets, teamScope()` | websearch_to_tsquery; guests search only their teams (🔗 S13 will attack this) |
| 5 | `feat(web): hybrid orchestration — local results instantly, server results merge in` | two-phase render; dedupe by id; loading affordance for the slow half |
| 6 | `feat(web): palette v2 — providers model (issues, actions, navigation, recent)` | each provider yields scored candidates; one ranker composes |
| 7 | `feat(web): frecency ranking — decayed usage counts persisted in Dexie` | frequency × recency decay; per-provider boosts |
| 8 | `feat(web): context actions — palette knows selection/route (change state of selected issues)` | palette actions dispatch S8 commands → undoable |
| 9 | `test(web): scorer unit tests + ranking regression fixtures ("gh" finds "GitHub sync")` | ranking bugs are regressions — pin them with fixtures |
| 10 | `test(e2e): quick-open flow; search-while-offline returns local results` | |
| 11 | `docs: ADR-0010 hybrid search; curriculum note` | |

## C — Review order
Scorer (1) → incremental index (2) → hybrid merge (5) → providers/ranker (6–7).

## D — Teaching comments (~9)
- subsequence scorer — 📘 fuzzy matching from first principles: gap penalties, camelCase/boundary bonuses, identifier fast-path; 80 lines you now own
- incremental index — ⚠️ rebuild-on-change is O(n) per keystrokes' worth of mutations; subscription-driven upserts; when to accept rebuilds (small n)
- tsvector weighting — 📘 FTS anatomy: normalization, stemming, ts_rank weights; why GIN not GiST here
- hybrid merge — 📘 progressive results: never block the instant path on the thorough path; dedupe strategy when both return the same issue
- frecency — 📘 the algorithm behind every good palette; decay half-life choice; storing it client-side (it's *your* muscle memory, not shared state)
- palette actions → commands — 🔗 S8's command layer means palette actions are undoable for free; count the spine's dividends again
- offline search — 🔗 local index over the S7 store = search works on a plane; the server half degrades, the product doesn't

## E — Debate
**"Ship a search library (Fuse.js/minisearch) vs hand-rolled scorer?"** Library: tuned, tested. Hand-rolled: ~80 lines, zero bundle cost, teachable, tunable to identifier patterns. **Resolution:** hand-rolled — this course optimizes for understanding; the ADR names the trigger to adopt a library (multi-field weighting across entity types grows past ~200 lines). Same reasoning shape as Meridian's XState debate — consistency across courses is itself the lesson.

## F/G — Close
- Squash: `feat(sprint-11): hybrid search + palette v2 (closes #…)`
- Deferred: comment/description full-content local search, search filters (`assignee:me`), OCR of attachments (joke → real deferred issue: attachment filename search).
- Recap idea: *great search is two systems — instant-and-local plus thorough-and-remote — merged so the user never sees the seam.*
