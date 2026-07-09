# Changelog

All notable changes to Tracer. Generated from Conventional Commits; grouped by sprint (each sprint was
one squash-merged PR). Dates are course-authoring dates.

## [1.0.0] — 2026-07-09

The first stable release: an offline-first, real-time issue tracker, built across 15 sprints as a
teaching curriculum. See [docs/COURSE-RETROSPECTIVE.md](docs/COURSE-RETROSPECTIVE.md).

### Sprint 15 — Production readiness
- **feat(api):** request-ID correlation on every request (`x-request-id`, reused or minted).
- **feat(api):** `/metrics` — counters, gauges, and a percentile-based SLO verdict (`p95WithinBudget`).
- **feat(shared):** `latency` (percentile/summarize/SLO), `trace` (client-inclusive mutation lifecycle
  with NTP-style clock-skew correction), `redact` (offline-first error context + PII scrub).
- **feat(api):** graceful WebSocket drain on SIGTERM/SIGINT — deploys become a controlled reconnect.
- **feat(web):** client treats a `draining` message as a normal reconnect.
- **docs:** runbooks (sync-lag, reconnect-storm, fanout-down, seq-divergence, backup-restore, rollback),
  the Redis fanout-loss postmortem, ADR-0012 (degraded-mode over redundancy), and the course retro.

### Sprint 14 — Accessibility & keyboard-first polish
- **feat(a11y):** registry-generated `?` shortcut-help overlay; polite `aria-live` region for toasts and
  live updates; skip link; `:focus-visible`; `prefers-reduced-motion`; data-driven light/dark theme.
- **docs:** ADR-0011 (accessible real-time UI).

### Sprint 13 — Hardening (channel authz, chaos)
- **fix(api):** per-team channel authz (`canSeeDelta`) — closes the cross-team delta leak (flaw #4).
- **docs:** security/chaos audit; convergence-under-chaos confirmed.

### Sprint 12 — Scale (virtualization, rebalancing, perf budgets)
- **fix(web):** virtualized board (flaw #3). **fix(shared):** `sortOrder` rebalancing + length metric
  (flaw #2). **perf:** presence throttle + batch (flaw #5). CI perf budget.

### Sprint 11 — Saved views & filters
- **feat:** filter AST with dual client/server evaluation; saved views as data.

### Sprint 10 — Search
- **feat:** hybrid fuzzy search + frecency; command palette v2.

### Sprint 09 — Presence
- **feat:** ephemeral presence bus (durable vs ephemeral state).

### Sprint 08 — Comments & undo/redo
- **feat:** comments as synced entities; undo/redo via inverse mutations.

### Sprint 07 — Offline-first client
- **feat(web):** overlay store (committed/pending), IndexedDB boot, optimistic apply, exactly-once
  effects via client `mutationId` + server dedupe; reconnect + catch-up; convergence property tests.

### Sprint 06 — Sync engine
- **feat(api):** mutation log with monotonic per-workspace `seq`; WS gateway (auth at upgrade, bootstrap
  from `lastSeq`, live deltas, bootstrap-gap buffering); in-process fanout (Redis-ready interface).

### Sprint 05 — Views & keyboard-first UI
- **feat(web):** canned views, command palette, keyboard registry; readiness endpoint.

### Sprint 04 — Ordering
- **feat(shared):** fractional indexing (`keyBetween`/`keyAfter`); drag-to-reorder.

### Sprint 03 — Issues CRUD
- **feat:** issues with per-team numbering; **fix:** identifier counter race (`SELECT FOR UPDATE`).

### Sprint 02 — Auth, sessions, RBAC
- **feat:** OAuth (dev + GitHub), Postgres sessions (hashed token), RBAC + guest team scoping;
  **fix:** OAuth `state` (login CSRF).

### Sprint 01 — Foundation
- **feat:** pnpm+Turborepo monorepo, Vite React SPA, Fastify API, Prisma/Postgres, shared package, CI.

[1.0.0]: https://github.com/elirc/tracer/releases/tag/v1.0.0
