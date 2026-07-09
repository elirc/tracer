# Tracer — Course Retrospective (v1.0.0)

Fifteen sprints, fifteen pull requests, one system: a Linear-style issue tracker that went from a
classic CRUD app to an offline-first, real-time, multiplayer product — with every architectural
decision written down and every shortcut deliberately planted and later harvested. This document
closes the course: it reveals the flaw ledger (author-private until now), tallies the "spine
dividend," and points at v2.

If you studied along, do the exercise at the bottom before reading v2 ideas.

---

## The arc: classic → sync

| Phase | Sprints | What you built | The lesson |
|-------|---------|----------------|------------|
| Foundation | S01–S05 | Monorepo skeleton, auth/sessions, RBAC, issues CRUD, keyboard-first UI, canned views | Build the boring spine well; it's what everything later stands on |
| The turn | S06–S07 | Mutation log + WS gateway; offline overlay store + reconnect + convergence tests | The single hardest idea: **the log is truth, the network is a hint** |
| Product depth | S08–S11 | Fractional ordering, undo/redo, comments, presence, saved filters | Features are cheap *on a correct spine*; most are just new mutations |
| Scale & safety | S12–S13 | Virtualization + rebalancing, channel authz, chaos | Harvest the planted debt; authz holds on **every transport** |
| Finish | S14–S15 | Accessibility, observability, ops, incident drill, release | Measure the promise, not the process; a11y and ops are earned, not bolted on |

The through-line: we built the classic app *so that* the migration to sync had something real to
migrate. You can't learn the hard version without first living the easy one.

---

## The flaw ledger, revealed

These were planted **on purpose** and are documented here for the first time. Every harvesting commit
quoted the ledger row and flipped its status — the rule was *never fix a planted flaw silently*.

| # | Planted | The debt | Harvested | How it felt in the code |
|---|---------|----------|-----------|--------------------------|
| 1 | S03 | Issue list refetched the whole collection on every mutation (invalidate-everything) | S06–S07 | The sync engine made refetching obsolete; the ADR named the old approach's cost |
| 2 | S04 | Fractional indexing with **no rebalancing** — `sortOrder` strings grew unboundedly under repeated same-slot inserts | S12 | A `maxKeyLength` metric caught the growth; a rebalancing job flattened it |
| 3 | S05 | Board rendered **all** issues — no virtualization | S12 | Fine at 50 issues, janky at 5000; TanStack Virtual + a perf budget in CI |
| 4 | S06 | Sync channel authz was **workspace-coarse** — guests received deltas for teams they couldn't read | S13 | A correct REST layer *hid* the leak for seven sprints; `canSeeDelta` closed it on live + backlog |
| 5 | S09 | Presence heartbeat every 2s per client, **unbatched** | S12–S13 | Cheap per client, a thundering herd at scale; throttle + batch |

**In-PR arcs** (planted and fixed inside one PR, to model tight debugging loops):
- S02 — OAuth `state` missing → login-CSRF test → fix.
- S03 — identifier counter race → `SELECT FOR UPDATE`.
- S06 — concurrent seq assignment race → failing test → transaction serialization.
- S07 — duplicate mutation delivery → client-generated `mutationId` dedupe.

**Why plant flaws at all?** Because "do it right the first time" is not how real systems are built or
learned. You feel *why* a pattern exists only after living without it. Flaw #4 is the sharpest: a
perfectly correct REST API lulled us for seven sprints while the WebSocket leaked — the lesson
(*authz on every transport*) doesn't land as a lecture; it lands as a leak you shipped.

---

## The spine dividend, tallied

The expensive foundations kept paying out. Concretely:

- **Mutation log (S06)** → made fanout loss survivable (S15 drill: zero data loss), made undo/redo
  (S08) a matter of inverse mutations, made comments (S08) "just another synced entity."
- **Overlay store + reconnect (S07)** → made deploys free (S15 drain-as-reconnect), made the client a
  first-class participant in distributed tracing (S15), made convergence-under-chaos a *property test*
  rather than a hope (S13).
- **Authz spine as pure functions (S02)** → reused verbatim as channel authz on the WebSocket (S13);
  one rule, every transport.
- **Keyboard registry (S05)** → made the `?` shortcut-help overlay (S14) a half-day feature instead of
  an archaeology project, because shortcuts were *data* from the start.

Every one of those "why are we spending a whole sprint on plumbing?" moments bought a later feature at
a discount. That's the entire thesis of the course, and it's now on the ledger in black and white.

---

## Competency map, revisited

By v1.0 you have shipped, and can explain the tradeoffs of: monorepo tooling · session vs JWT auth ·
RBAC + resource scoping · cursor pagination · **CRDT-adjacent sync (mutation log + convergence)** ·
offline-first optimistic UI with exactly-once effects · fractional indexing + rebalancing · undo/redo
via inverse ops · filter ASTs with dual client/server evaluation · fuzzy search + frecency ·
virtualization + perf budgets · authz on every transport · accessibility for real-time UIs ·
observability (percentile SLOs, client-inclusive tracing) · graceful deploys · blameless incident
response. That is a mid-to-senior surface area, and you built the receipts.

---

## Your exercise: "what I'd build differently"

Before reading v2 ideas, write your own retro (a page is plenty):
1. Which planted flaw would you have caught in review, and how? Which would you have shipped too?
2. Pick one ADR you'd decide the *other* way today. Argue it.
3. What's the first thing you'd instrument that we didn't?

There is no answer key. Senior engineering is judgment under tradeoffs, and the only way to practice is
to commit to an opinion and defend it.

---

## v2 ideas (course 2 and beyond)
- **GitHub integration** (the product's namesake trick): two-way sync of issues with a real external
  system — reconciliation, webhooks, and *their* authz meeting *ours*.
- **Mobile client** sharing `@tracer/shared` — the payoff of putting pure logic in a package.
- **Text CRDT** for comment/description collaborative editing — where the mutation-log model meets its
  limits and true CRDTs earn their complexity.
- **Real infra**: Redis-backed fanout at scale (revisit ADR-0012's trigger), OTel + a tracing backend,
  load testing at 10k concurrent.

**Next course:** Pulse (a PostHog/analytics-lite clone) — event ingestion, funnels, and a very
different data-shape problem. The spine habits transfer; the domain does not.

> You don't operate a real-time system by watching servers — you watch the promise: everyone
> converges, quickly.
