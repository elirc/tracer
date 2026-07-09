# Curriculum Note — Sprint 01: Foundation & Walking Skeleton

## Learning objectives
- Understand a pnpm + Turborepo **monorepo**: package boundaries and the dependency-direction
  rule (apps depend on packages, never the reverse).
- See a **walking skeleton**: a thin end-to-end slice (DB → API → UI) plus a WebSocket echo,
  built before any real feature.
- Read two framing ADRs and understand why the whole course is shaped by them.

## Key concepts
- **Shared contract, one source of truth.** `@tracer/shared` holds the Zod `WorkspaceSchema`
  and `EchoMessageSchema`. Both `api` and `web` import them, so the API can't return a shape the
  client doesn't expect. Prisma's generated types stay in `@tracer/db` (storage shape), free to
  diverge from the contract (ADR-0002's spirit).
- **build() separate from listen().** `apps/api/src/server.ts` returns the Fastify app without
  starting it, so tests boot it in-process with `app.inject(...)` — no real port, no flakiness.
- **The HTTP → WS upgrade.** `apps/api/src/ws.ts` handles the upgrade itself (`noServer: true`)
  so the lifecycle is explicit. This is where Sprint 06 will hook authentication in. The
  heartbeat (ping/pong) exists because a dead TCP connection looks alive until you ping it.
- **Env validated at boot.** `apps/api/src/env.ts` parses `process.env` through Zod at startup —
  bad config crashes immediately with a clear message, not at the first request that needs it.
- **Connection-state model.** `apps/web/src/lib/useWs.ts` already models `connecting/open/closed`
  and reconnects with capped backoff + jitter — the shape the real sync client reuses in S07.

## Exercise questions
1. Why does `WorkspaceSchema` live in `@tracer/shared` rather than being generated from the
   Prisma model? What breaks the day the storage shape and the API shape need to differ?
2. `server.ts` exports `buildServer()` and `index.ts` calls `listen()`. What does this split buy
   the test suite? Try inlining `listen()` into `buildServer()` and see what happens to
   `server.test.ts`.
3. The WS gateway pings clients every 30s and terminates ones that miss a pong. What failure does
   this catch that `ws.on("close")` does not?
4. ADR-0002 says some of this code is *designed to be deleted* in Sprint 06–07. Which parts, and
   why is planned throwaway cheaper here than building the sync engine now?

## Further reading
- Turborepo tasks & caching · pnpm workspaces
- Zod as a runtime contract at trust boundaries
- The WebSocket upgrade handshake (RFC 6455, §4)
- Fastify testing with `inject`
