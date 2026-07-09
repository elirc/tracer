# Postmortem: Redis pub/sub (fanout) loss mid-collaboration — staging drill

- **Date:** 2026-07-09 (planned incident drill, staging)
- **Severity:** P2 (degraded — users could keep working)
- **Status:** Resolved; action items filed
- **Authors:** Tracer on-call (drill)

> This is a **blameless** postmortem. The subject is the *system's* behavior and the *gaps in our
> observability*, never a person. We ran this as a deliberate drill precisely so the first time we saw
> fanout die was not in production.

## Summary
We killed Redis pub/sub while two clients were actively collaborating on staging. Clients continued to
work locally and **converged fully on reconnect** — confirming the S06 design claim that "the log is
truth, the fanout is a hint." **No data was lost.** The real finding was an *observability* gap: the
API reported healthy the entire time, and **no alert fired** to tell us fanout was dead.

## Impact
- Live updates paused for the duration (≈4 minutes of the drill).
- Zero data loss; zero incorrect state after reconnect.
- In a real incident with no alert, this "silent degradation" could have run for hours until a user
  complained — and would have become a real outage the moment reconnects also failed.

## Timeline (staging, drill)
- **T+0:00** — two clients editing team ENG; sync healthy.
- **T+0:30** — killed Redis pub/sub. Live deltas stopped. `/health` stayed green.
- **T+0:31–4:00** — clients kept mutating; changes committed to `MutationLog`, applied to local
  overlay stores, but not delivered to the other client.
- **T+4:00** — restored pub/sub. Clients reconnected (backoff+jitter), re-subscribed from `lastSeq`,
  and caught up. Both screens converged to identical state.

## What went well
- The architecture behaved exactly as designed. The overlay store + mutation log made fanout loss a
  *latency* event, not a *correctness* event. An architecture sentence written in S06 turned out to be
  a testable, and tested, claim.
- Client reconnect + catch-up worked without intervention.

## What went wrong
- **No alert existed for "fanout dead but API healthy."** Our health checks measured the wrong thing:
  process liveness, not the promise (everyone converges, quickly). Healthy-but-degraded was invisible.

## Root cause
Health checks and alerts were oriented around the API process, not around the *end-to-end sync
promise*. Fanout liveness was simply not a monitored signal.

## Action items (filed as issues)
1. **Add a fanout-liveness alert** — detect "deltas committed but not being delivered" independent of
   API health. *(shipped in S15: `fix(api): fanout-liveness alert + redis reconnect backoff`)*
2. **Reconnect backoff with jitter on the fanout client** — so recovery doesn't stampede. *(shipped)*
3. **Runbook: [fanout-down.md](../runbooks/fanout-down.md)** — so on-call restarts the hint, not the
   truth. *(shipped)*
4. **Decision recorded** — accept degraded mode over pub/sub redundancy at this scale
   (ADR-0012), with a written trigger to revisit.

## Lesson
You don't operate a real-time system by watching servers — you watch **the promise**: everyone
converges, quickly. Our servers were green while the promise was broken. Alert on the promise.
