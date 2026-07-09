# ADR-0010: Hybrid search — instant-local + thorough-remote — and a hand-rolled fuzzy matcher

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S11
- **Deciders:** Tracer authors

## Context
The command palette needs to find both actions and issues, fast. Actions are already in memory;
issues may number far more than the client has loaded.

## Decision
- **Two systems, merged so the user never sees the seam.** Commands are fuzzy-ranked **locally and
  instantly** (`fuzzyMatch`), boosted by **frecency** (frequency × recency, persisted). Issues come
  from a **debounced server search** across the user's teams — the long tail the local store hasn't
  loaded.
- **A hand-rolled fuzzy matcher** (`@tracer/shared/fuzzy.ts`), ~80 lines: subsequence matching with
  bonuses for consecutive runs, word boundaries, and camelCase humps.

## Alternatives considered
- **A fuzzy-search library (Fuse.js / minisearch).** Tuned and tested. Rejected for this course: the
  matcher is ~80 lines, adds zero bundle, and is fully ours to tune to identifier patterns. The ADR
  names the trigger to adopt a library: multi-field weighting across entity types past ~200 lines.
  (Same reasoning shape as the XState decision in Meridian — build the concept first.)
- **Server-only search.** Correct, but every keystroke is a round-trip; local instant matching is
  what makes a palette feel like it was already there.

## Consequences
- The client path is instant and offline-capable; the server path covers scale.
- Frecency lives client-side (it's *your* muscle memory, not shared state).
- The server search is **permission-scoped** (guests only search their teams) — a search index that
  forgets scoping is a data-exfiltration API.
- Ranking bugs are regressions; pin them with fixtures (the boundary/consecutive tests).

## Links
- `packages/shared/src/fuzzy.ts` (+ tests), `apps/web/src/CommandPalette.tsx`,
  `apps/api/src/routes/search.ts`, `docs/sprints/sprint-11.md`
