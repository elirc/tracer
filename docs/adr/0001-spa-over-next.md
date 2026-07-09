# ADR-0001: Vite SPA over Next.js

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S01
- **Deciders:** Tracer authors

## Context
Tracer is a local-first collaborative app. From Sprint 06–07 the client owns a normalized
store that must boot from cache (IndexedDB) **without** waiting on a server render, and the
sync engine pushes updates over a WebSocket. The product lives entirely behind auth, so SEO
value is near zero. We need to choose the frontend shell now because it shapes every later
sprint.

## Decision
We will build the web app as a **Vite + React single-page application**.

## Alternatives considered
- **Next.js (App Router).** Gives SSR/SSG, file routing, and strong conventions. Rejected:
  an auth-gated tool gets almost no SEO benefit; SSR introduces a server-render vs.
  local-state "split-brain" that fights the local-first store we build in S07; and the
  WebSocket/local-first story is simpler in a pure SPA. Meridian (Course 1) already taught
  the Next.js tradeoffs, so we spend our novelty budget elsewhere.

## Consequences
- No server rendering: we must handle loading/empty/error states explicitly (good discipline).
- The app shell can boot from the local store first and reconcile with the server after —
  exactly what S07's offline-first client needs.
- **Revisit if** a public, SEO-relevant surface (marketing site, shared public boards) is added;
  that could live in a separate Next.js app rather than reshaping this one.

## Links
- ADR-0002 (the classic→sync roadmap that makes local-first the endgame)
- `docs/sprints/sprint-01.md`
