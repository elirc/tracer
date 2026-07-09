# ADR-0003: Server-side sessions over stateless JWTs

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S02
- **Deciders:** Tracer authors

## Context
Users authenticate via OAuth (a dev provider locally/CI, GitHub in prod). We need to keep them
signed in across requests. The two mainstream options are a stateless signed token (JWT) held by
the client, or a server-side session with an opaque cookie.

## Decision
We will use **server-side sessions stored in Postgres**. The cookie carries a random token; we
persist only its SHA-256 hash. Cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.

## Alternatives considered
- **Stateless JWT.** No session store, trivially horizontally scalable. Rejected: revocation is
  the problem — a stolen or stale JWT is valid until it expires, and "log out everywhere" or
  "this session was compromised" requires a denylist that reintroduces the very server state JWTs
  were meant to avoid. At our scale a session row is simpler and gives instant revocation for free.
- **Redis sessions.** Faster lookups, but adds infrastructure before we've measured a need for it;
  one datastore (Postgres) is simpler for now.

## Consequences
- Every authenticated request does one indexed session lookup by token hash. Cheap at our scale.
- Instant revocation: deleting the row ends the session immediately.
- **Revisit if** session reads show up as a bottleneck in Sprint 13 profiling — then move the
  session store (only) to Redis, keeping the same cookie/token model.

## Links
- `apps/api/src/auth/session.ts`, `apps/api/src/routes/auth.ts`, `docs/sprints/sprint-02.md`
