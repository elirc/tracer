# ADR-0002: The classic → sync migration roadmap

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S01
- **Deciders:** Tracer authors

## Context
Tracer's signature subject is real-time collaboration: a sync engine, offline-first clients,
and conflict resolution. This is genuinely hard, and teaching it cold — building a sync engine
in Sprint 1 — would overwhelm before the learner understands *why* each piece exists.

## Decision
We will build Tracer as a **classic REST + TanStack Query app first (Sprints 1–5)**, then
**migrate it to a local-first sync engine (Sprint 06 server spine, Sprint 07 offline-first
client)**. The classic architecture is a deliberate, planned throwaway — its replacement is the
core lesson of the course.

The endgame is named here so every early decision can be made with it in view: for example, we
choose a SPA (ADR-0001) and per-field mutation granularity precisely because the sync engine
will need them.

## Alternatives considered
- **Build the sync engine from day one.** Rejected: premature. Without first *feeling* the
  limits of the classic approach (Sprint 05 will make invalidate-everything visibly laggy),
  the learner can't appreciate what the sync engine buys. Building it cold also front-loads the
  hardest material before the domain is understood.

## Consequences
- Some Sprint 1–5 code (notably the TanStack-Query data layer) is intentionally deleted in
  Sprint 06–07. That is a feature, not waste: the migration *is* the curriculum, and doing it
  under a live product is the most valuable thing in the course.
- Early sprints should keep their data layer at arm's length so the swap is clean.
- **Revisit:** never — this is a pedagogical decision, not a technical one that scale could
  overturn. (See the recurring "build-once-badly-then-adopt" thesis across the whole curriculum.)

## Links
- ADR-0001 (SPA over Next), `docs/sprints/README.md` (the cross-sprint arc), `docs/sprints/sprint-06.md`, `docs/sprints/sprint-07.md`
