# Runbook: fanout (pub/sub) down — live updates stopped, API healthy

**Symptom:** No live deltas reaching clients, but `/health` and `/ready` are green and REST works.
This is the exact gap the S15 drill exposed (see the postmortem): the API can be perfectly healthy
while the *hint* is dead.

## What is actually happening (stay calm)
The `MutationLog` is truth; fanout is a hint (ADR-0006). With fanout down:
- **No data is lost.** Every mutation is still committed to the log.
- Clients stop receiving *live* deltas, but **catch up fully on reconnect** from their `lastSeq`.
- So the user impact is *delayed* updates, not *wrong* or *lost* updates. This is degraded, not down.

## Checks
1. Confirm via the `fanout-liveness` alert (added after the S15 drill). If you're reading this because
   *lag* pages fired but the API is green, fanout is the likely cause.
2. Check the pub/sub backend (Redis) health directly — connectivity, memory, its own liveness.

## Fix
1. **Restart the hint, never the truth.** Restart/reconnect the fanout (Redis) — the client has backoff
   with jitter, so recovery won't stampede (ADR-0012).
2. Once fanout is back, clients on their next heartbeat/reconnect resume live delivery and catch up.
   You do **not** need to restart the API or touch the database.

## Do NOT
- Do **not** restart the API pods hoping to "fix sync" — the API is fine; you'd cause a reconnect storm
  (see that runbook) for nothing.
- Do **not** touch the `MutationLog`. The whole reason this is survivable is that the log was never
  involved.

## Why we don't just make fanout redundant
See ADR-0012. We accept this proven degraded mode and alert on it, rather than carry Redis Sentinel's
ops weight to prevent a survivable event. The alert is the fix the drill actually taught us we needed.
