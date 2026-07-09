# Tracer — Linear-Class Issue Tracker

## Project Spec & 15-Sprint Upskilling Curriculum (Course 2)

**Version:** 1.0 · **Date:** 2026-07-09 · **Folder:** `tracer/` (splits into its own repo later)

---

## 1. Purpose

Second course in the clone curriculum (after **Meridian**, the EOR platform). Same model: the AI authors every PR, commit, teaching comment, and design debate; the junior observes, predicts, reviews-before-reveal, and runs the labs.

**What this course uniquely teaches** (Meridian could not):

- **Real-time sync engines** — mutation logs, sequence numbers, delta protocols
- **Offline-first / optimistic clients** — client-side store, outbound queue, rebase, convergence
- **WebSockets** — bidirectional transport, presence, fanout across instances
- **Keyboard-driven UX performance** — command palette, latency budgets, virtualization

**Signature teaching arc:** the app is deliberately built as a *classic* REST + query-cache web app in Phase 1, then **migrated to a local-first sync engine** in Phase 2. The junior watches a senior team replace an architecture under a live product — the most valuable arc in the course.

> Clone of the *functionality* of Linear (issues, boards, cycles, command palette, real-time collaboration) — not its branding, visual design, or assets. Product name: **Tracer**.

## 2. Product Overview

**Personas:** Workspace Admin · Member · Guest (limited to specific teams).

**Core domains:** workspaces & teams → issues (identifier `ENG-123`, status, priority, labels, assignee, ordering) → boards & views (kanban, filters, saved views, cycles) → collaboration (comments, mentions, presence, notifications) → command palette & keyboard-first UX → search.

## 3. Tech Stack

| Layer | Choice | Teaching rationale |
|---|---|---|
| Language / repo | TypeScript strict · pnpm + Turborepo | carried from Meridian |
| Frontend | **React 19 + Vite SPA** (not Next) | local-first app shell; ADR-0001 argues it |
| Client data (Phase 1) | TanStack Query | the "classic" architecture, later replaced |
| Client data (Phase 2) | **Custom normalized store + Dexie (IndexedDB)** | the sync-engine client — the point of the course |
| Drag & drop / lists | dnd-kit · TanStack Virtual | board reorder; 10k-issue lists |
| API | Fastify (REST bootstrap) + **`ws` WebSocket gateway** | |
| Sync fanout | **Redis pub/sub** | multi-instance delta delivery |
| DB / jobs | PostgreSQL + Prisma · BullMQ | carried from Meridian |
| Auth | **GitHub OAuth** + sessions | OAuth is new; sessions carried |
| Testing | Vitest · Playwright (incl. multi-context real-time + keyboard-only) · fast-check (sync convergence) | |
| CI/CD, deploy, observability | GitHub Actions · Docker · Railway/Fly · Pino/OTel/Sentry | carried; extended with sync-lag metrics |

**Layout:** `apps/web`, `apps/api` (HTTP + WS gateway + worker), `packages/db`, `packages/shared` (mutation & entity schemas), `packages/store` (the sync client, extracted in S7), `packages/config`, `docs/{adr,curriculum,sprints,runbooks}`.

## 4. Curriculum deltas vs Meridian

1. **Fast-forward rule:** patterns already taught in Meridian (monorepo, CRUD craft, RBAC, queues, email) get bigger commits and few teaching comments. Comment density goes to the new domain.
2. **Latency budget discipline:** from S5, an interaction-latency budget (<100ms keyboard action → paint) is a documented, CI-checked contract.
3. **Convergence testing:** property-based tests assert that any interleaving of offline edits converges (S7, S13).
4. **Learner does more:** predict-before-reading and review-before-reveal are mandatory every sprint; the junior co-authors the S8 junior-side commits and runs the S13 audit tooling themselves.

### Competency additions

| Competency | Taught in |
|---|---|
| OAuth flows & token handling | S2 |
| Ordered collections (fractional indexing) | S4, S12 |
| Sync protocol design (bootstrap/delta/ack/rebase) | S6, S7 |
| Offline storage & migration (IndexedDB) | S7 |
| Conflict resolution (LWW-per-field), logical ordering | S6, S7, S13 |
| Command pattern, undo/redo | S8 |
| Presence & ephemeral state | S9 |
| Client-side query engines (filter AST) | S10, S11 |
| Rendering performance & latency budgets | S4, S12 |
| WS operations at scale (chaos, load, authz) | S13, S15 |

## 5. Domain Model (reference)

```
Workspace ─┬─ User (via Membership: ADMIN | MEMBER | GUEST[teams])
           ├─ Team ─┬─ Project
           │        ├─ WorkflowState (ordered, typed: backlog/unstarted/started/done/canceled)
           │        ├─ Cycle (time-boxed, auto-rollover)
           │        └─ Issue (identifier ENG-123, priority, estimate, sortOrder,
           │                  assignee, labels[], state, parent?) ─┬─ Comment ── Reaction
           │                                                      └─ Subscription (@mentions, watchers)
           ├─ Label · SavedView (filter AST + display config)
           ├─ MutationLog (seq, clientId, mutationId, entity, patch, ts)   ← the sync spine (S6)
           └─ Notification / PresenceState (ephemeral, Redis only)
```

## 6. Sprint map

| # | Sprint | Phase | Size | Headline |
|---|---|---|---|---|
| 1 | Foundation & walking skeleton (SPA + WS echo) | MVP | S | Fast-forward setup; ADR: SPA, ADR: classic-then-sync plan |
| 2 | GitHub OAuth, workspaces, teams, roles | MVP | M | OAuth, guest scoping |
| 3 | Issues core — classic architecture v1 | MVP | L | REST + TanStack; identifiers; deliberate "before" architecture |
| 4 | Board, ordering & keyboard v1 | MVP | L | dnd-kit, fractional indexing, command palette v1 |
| 5 | Views, seed, E2E, deploy → `v0.5.0` | MVP | M | Latency budget doc; keyboard-only E2E |
| 6 | Sync engine I — server spine | Full | L | Mutation log, seq, WS gateway, Redis fanout |
| 7 | Sync engine II — offline-first client | Full | XL | **Flagship:** Dexie store, outbound queue, rebase, convergence |
| 8 | Undo/redo & optimistic UX | Full | M/L | Dialogue format; command pattern, inverse mutations |
| 9 | Collaboration — comments, mentions, presence | Full | L | Ephemeral state, typing, notification inbox over sync |
| 10 | Views, filters & cycles | Full | L | Filter AST evaluated server+client; cycles auto-rollover |
| 11 | Search & command palette v2 | Full | M/L | Hybrid local/server search, frecency ranking |
| 12 | Performance — virtualization & sync payloads | Full | L | 10k issues, budgets in CI, index rebalancing harvest |
| 13 | Hardening — sync chaos & security audit | Full | L | Audit format; WS fuzzing, convergence properties, channel authz |
| 14 | Accessibility & keyboard-first polish | Full | M/L | Accessible DnD alternative, palette a11y, theming |
| 15 | Production readiness → `v1.0.0` | Full | L | Sync-lag observability, incident drill, runbooks |

Sprint order of events, artifacts, and merge ritual: see [docs/sprints/00-workflow.md](docs/sprints/00-workflow.md) and the per-sprint playbooks.

## 7. Open questions (decide before Sprint 1)

1. GitHub OAuth app credentials (needs a GitHub org/app) — or fall back to email magic links?
2. Hosting: same provider as Meridian for operational familiarity, or vary deliberately?
3. Does the junior co-author from S8 as planned, or stay observer throughout?
