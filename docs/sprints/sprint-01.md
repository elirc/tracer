# Sprint 01 — Fast-Forward Foundation: SPA + API + WS Echo

**Branch:** `sprint-01/foundation` · **Size:** S · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Meridian-S1 patterns applied wholesale in a day, plus the two decisions that define this course: SPA architecture and the classic→sync migration roadmap. The walking skeleton includes a WebSocket echo — real-time is in the skeleton from hour one.

## A — Issues
1. `Monorepo scaffold: apps/web (Vite SPA), apps/api (Fastify + ws), packages/{db,shared,config}`
2. `Walking skeleton: workspace name DB → REST → UI, plus WS echo roundtrip`
3. `CI + repo governance (fast-forward from Meridian)`
4. `ADR-0001 SPA over Next; ADR-0002 classic-then-sync migration roadmap`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `chore: monorepo scaffold — workspace, turbo, config presets` | Meridian S1 commits 1–2 compressed into one; fast-forward rule in action, commit body says so |
| 2 | `feat(web): vite spa shell — router, layout, theme tokens` | |
| 3 | `feat(api): fastify + /health + zod env` | |
| 4 | `feat(db): prisma + Workspace model + docker-compose postgres + seed` | |
| 5 | `feat(api): ws gateway skeleton — upgrade handling, /ws echo` | the new material starts here; heartbeat ping/pong |
| 6 | `feat(web): ws client hook — connect, echo roundtrip rendered in shell` | reconnect with backoff from day one |
| 7 | `test: unit wiring in all packages + ws echo integration test` | |
| 8 | `ci: typecheck, lint, test, build + branch protection` | no scripted red-CI beat this time (Meridian taught it) |
| 9 | `docs: PR template, CONTRIBUTING, ADR-0001 SPA over Next` | |
| 10 | `docs: ADR-0002 — the classic→sync migration roadmap` | **the course thesis document**: Phase 1 ships TanStack Query deliberately; S6–S7 replace it; the ADR names what will be thrown away and why that's a feature |
| 11 | `docs: curriculum note sprint 01` | |

## C — Review order
ADR-0002 first (it frames all 15 sprints) → ws gateway (5) → ws client hook (6) → the rest is Meridian revision.

## D — Teaching comments (~8)
- ADR-0001 — 📘 why local-first wants an SPA: the app shell must boot from cache without a server render; where Next would fight us
- ADR-0002 — 📘 planned throwaway architecture: building classic first is cheaper than teaching sync cold; the migration *is* the curriculum
- ws upgrade handling — 📘 HTTP→WS upgrade lifecycle; why auth happens at upgrade time (🔗 done for real in S6)
- ping/pong — ⚠️ dead connections look alive; heartbeats and liveness timeouts
- reconnect hook — 📘 backoff + jitter; the connection-state enum the whole UI will consume later
- commit 1 body — 🔍 review-lens: fast-forward rule — mastered patterns get compressed commits; density budget goes to new domains

## E — Debate
**"Vite SPA vs Next.js?"** Next: SSR/SEO, conventions. SPA: instant boot from local store, no server-render/local-state split-brain, simpler WS story. **Resolution:** SPA — an issue tracker behind auth has near-zero SEO need; Meridian already taught the Next tradeoffs. → ADR-0001.

## F/G — Close
- Squash: `feat(sprint-01): foundation — spa, api, ws echo skeleton (closes #…)`
- Recap idea: *the second project's first sprint should be boring — spend novelty budget only on what's new (the socket).*
