# Runbook: reconnect storm

**Symptom:** `ws.connections_total` climbing fast while `ws.connections_active` stays flat or
oscillates; API CPU up; DB read load up (every reconnect runs a backlog query).

## Cause model
Every client that drops re-runs `subscribe` → backlog query from its `lastSeq`. If many clients drop
at once (a deploy without drain, a load-balancer blip, a fanout flap), they reconnect in a
**synchronized wave**, and the backlog queries stampede the DB — which slows things down, which drops
more clients. A feedback loop.

## Checks
1. **Was there a deploy?** A deploy *without* graceful drain drops everyone simultaneously. Confirm the
   drain ran (`SIGTERM received — draining` in logs). If deploys skip drain, that's the bug.
2. **Is backoff working?** Clients back off with jitter (`sync.tsx`: `2**attempts` capped at 10s, plus
   random 0–250ms). A storm that does *not* decay means backoff/jitter regressed — check the client build.
3. **Fanout flapping?** Repeated fanout up/down cycles cause repeated reconnects. Stabilize fanout first.

## Fix
- Let backoff+jitter do its job; it's designed to de-synchronize the wave. Do not manually kick clients.
- If the DB is the bottleneck, temporarily scale read capacity; the backlog query is `seq > lastSeq`
  on an indexed column, so it's cheap per-client but deadly at once.
- If a deploy caused it, ensure drain is wired (S15: `drainWebSocketGateway` on SIGTERM).

## Do NOT
- Do **not** disable client reconnect to "stop the storm" — that just converts a recoverable storm into
  a hard outage. Reconnect is the healing mechanism, not the disease.
