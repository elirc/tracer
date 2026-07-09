# Tracer

An offline-first, real-time issue tracker (a Linear-style clone) — and a **15-sprint upskilling
curriculum** built entirely as pull requests. Every sprint is one PR loaded with teaching artifacts:
heavily annotated code, ADRs, planted-then-harvested design debt, and inline review commentary.

> **This repo is a course.** The code is real and runs; the commit history, PR comments, ADRs, and
> curriculum notes are the actual product. Read it in order and you go from junior to mid/senior on a
> modern TypeScript stack. Start with [`docs/LEARNER-GUIDE.md`](docs/LEARNER-GUIDE.md).

**Current release:** `v1.0.0` — see [CHANGELOG.md](CHANGELOG.md) and the
[Course Retrospective](docs/COURSE-RETROSPECTIVE.md).

## What it does
- Issues with per-team numbering, workflow states, labels, comments, undo/redo.
- **Real-time multiplayer**: changes stream to every collaborator over WebSockets.
- **Offline-first**: edits apply optimistically to a local store and converge on reconnect —
  exactly-once in effect, order-independent.
- Keyboard-first UX (command palette, single-key shortcuts, `?` for help), saved filters, fuzzy search,
  live presence, light/dark theme, and an accessible real-time UI.

## Architecture in one breath
The **`MutationLog` is truth; the network is a hint.** Every change is a sequenced mutation appended to
a per-workspace log. Clients bootstrap from their `lastSeq`, apply live deltas, and — because
`applyServerDelta` is idempotent and deltas reduce in seq order — converge no matter how the network
drops, duplicates, or reorders. Presence is ephemeral and routed separately. See ADR-0006 and -0007.

## Stack
- **Monorepo:** pnpm workspaces + Turborepo · TypeScript strict · Node 22
- **Web:** Vite + React SPA (`apps/web`)
- **API:** Fastify + `ws` (`apps/api`)
- **Data:** Prisma + PostgreSQL (`packages/db`)
- **Shared:** Zod schemas + pure logic — sync, ordering, authz, filters, fuzzy, latency, tracing
  (`packages/shared`), reused by both client and server
- **Tests:** Vitest + fast-check (property tests) · ESLint flat config

## Layout
```
apps/web        Vite React SPA
apps/api        Fastify HTTP + WebSocket sync gateway
packages/shared Zod + pure, unit-tested logic (the spine)
packages/db     Prisma schema, client, seed
packages/config Shared tsconfig / presets
docs/           The course: ADRs, curriculum notes, runbooks, postmortems, retrospective
```

## Quick start
```bash
pnpm install
docker compose up -d            # Postgres (see packages/db/docker-compose.yml)
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev                        # web + api (+ ws) together
```
Then open the web app, sign in with the dev provider, and try two browser windows to see live sync.

## Course docs
- [`docs/LEARNER-GUIDE.md`](docs/LEARNER-GUIDE.md) — how to study the repo (predict-before-reading, etc.)
- [`docs/COURSE-RETROSPECTIVE.md`](docs/COURSE-RETROSPECTIVE.md) — the arc, the flaw ledger revealed
- [`docs/adr/`](docs/adr/) — every architectural decision, with alternatives
- [`docs/curriculum/`](docs/curriculum/) — per-sprint learning notes
- [`docs/runbooks/`](docs/runbooks/) · [`docs/postmortems/`](docs/postmortems/) — operate it for real

## Development
```bash
pnpm run lint                       # ESLint
pnpm turbo run typecheck test build # everything
```
CI runs the same on every PR. Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md).
