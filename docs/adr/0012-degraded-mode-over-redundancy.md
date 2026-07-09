# ADR-0012: Accept a proven degraded mode instead of adding pub/sub redundancy

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S15
- **Deciders:** Tracer authors

## Context
The fanout (Redis pub/sub, in the production topology) is a *hint*, not the source of truth — the
`MutationLog` is truth (ADR-0006). The incident drill (S15) killed pub/sub mid-collaboration on
staging and confirmed the design claim: clients kept working from their local overlay store, and on
reconnect they caught up from `lastSeq` off the durable log. Nothing was lost; updates were merely
delayed until reconnect.

That result forces a real decision. We could harden pub/sub with Redis Sentinel / a cluster (fewer
degradation events), or we could accept the degraded mode we just proved survivable and invest the
ops budget elsewhere.

## Decision
**Accept degraded mode. Do not add pub/sub redundancy at this scale.** Instead:
- Add a **fanout-liveness alert** — the drill's real finding was that the API stayed "healthy" while
  fanout was dead, so no page fired. That gap, not the outage itself, was the incident.
- Add **reconnect backoff with jitter** on the fanout client so recovery doesn't stampede.
- Write the trigger to revisit: sustained multi-instance scale, or SLO burn attributable to fanout
  gaps (p95 mutation→foreign-apply breaching 500ms because deltas wait for reconnect, not because the
  server is slow).

## Alternatives considered
- **Redis Sentinel / clustered pub/sub now.** Fewer degradation events, but real ops weight
  (failover testing, more moving parts, more to page on) to protect a path we've demonstrated is
  non-critical. Redundancy for a component whose loss is survivable is gold-plating.
- **Do nothing.** Tempting after a clean drill — but "clients survive" is only true if they *reconnect*,
  and we had no alert telling us fanout was down. Silent degradation becomes a silent outage the day
  reconnects also fail. The alert is the cheap, load-bearing half.

## Consequences
- Fanout loss is now an *alertable, understood, survivable* event rather than a mystery. The runbook
  (`docs/runbooks/`) documents the degraded behavior so on-call doesn't panic-restart the wrong thing.
- We are explicitly trading a small amount of update *latency during an incident* for a large amount of
  ops *simplicity always*. That trade is only sound because the store's design makes the latency
  bounded and the data safe.
- **The lesson, generalized:** a *proven* degradation path can be worth more than redundancy. Test the
  failure, and you may find you don't need to prevent it — you need to observe it.

## Links
- `apps/api/src/lib/fanout.ts`, `apps/api/src/lib/metrics.ts`, `docs/postmortems/2026-07-09-redis-fanout-loss.md`,
  `docs/runbooks/`, ADR-0006 (mutation-log sync), ADR-0008 (durable vs ephemeral)
