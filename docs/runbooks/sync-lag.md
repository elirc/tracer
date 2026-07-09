# Runbook: sync lag (edits slow to reach teammates)

**Symptom:** `slo.p95WithinBudget` is `false` on `/metrics`, or users report "I moved a card and my
teammate didn't see it for 10 seconds." The SLO is **p95 mutation-commit → foreign-client-apply < 500ms**.

## Why this metric and not "server latency"
The number that matters is the one users *feel*: my edit on your screen. Server request latency can be
green while sync lag is red — the delay lives in fanout delivery or client reconnect, not in the HTTP
handler. Always diagnose against the end-to-end percentile, never a server-side average.

## Checks, in order
1. **Is fanout alive?** Check the `fanout-liveness` alert / `/metrics` `gauges`. If fanout is down, go
   to [fanout-down.md](fanout-down.md) — lag is the *symptom*, dead fanout is the *cause*.
2. **Reconnect storm?** A spike in `ws.connections_total` with a low steady `ws.connections_active`
   means clients are flapping — deltas wait for reconnect. Go to [reconnect-storm.md](reconnect-storm.md).
3. **DB write latency.** `MutationLog` inserts are serialized per workspace (seq assignment). If commit
   latency is up, check DB CPU / lock waits for hot workspaces. A single huge workspace can dominate.
4. **Per-workspace, not global.** Percentiles are computed globally in the tiny registry; in the real
   dashboard, slice by workspace. One 50k-issue workspace rebalancing (S12) can skew the global p95
   while everyone else is fine.

## Fix
- Fanout degraded → restart the pub/sub hint (never the log). Clients catch up on reconnect.
- Hot-workspace write contention → the seq bottleneck is by design (correctness); mitigate by checking
  for a runaway client hammering mutations, and rate-limit if needed (deferred item from S13).

## Do NOT
- Do **not** "speed things up" by touching the `MutationLog` schema or seq assignment under pressure —
  that's the correctness spine. Lag is recoverable; a broken seq is not.
