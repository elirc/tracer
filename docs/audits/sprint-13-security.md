# Security & Chaos Audit — Sprint 13

Audit-first, findings ranked by severity. The centerpiece is a real cross-team data leak on the
WebSocket that had aged for seven sprints.

## Findings

| # | Finding | Severity | Fix |
|---|---|---|---|
| P1 | **Channel authz is workspace-coarse (flaw #4).** A guest subscribed to a workspace received sync deltas for EVERY team, including teams they can't read via REST. | P1 | `canSeeDelta` filters deltas by team access on both the live and backlog paths |
| P2 | Convergence under transport chaos (drop/dup/reorder) was asserted only implicitly | P2 | The store convergence property test already reduces in seq order (order-independent); documented as the chaos guarantee |
| P3 | No per-session mutation rate limit | P3 | Deferred (token-bucket on the write path) |

## Fixed this PR — P1 (flaw #4 harvest)
**The leak.** The WS gateway (S06) checked *workspace* membership, then forwarded every team's deltas.
A guest scoped to Team A could read, from raw WS frames, issue titles/state changes for Team B — data
the REST API correctly refused them. A transport-layer authz gap hiding behind a correct-looking REST
layer: exactly how real leaks age.

**The fix.** Every delta carries the `teamId` it changed. `canSeeDelta(membership, teamId)` — the same
authz spine as S02 — gates forwarding on both the live fanout path and the backlog stream. A regression
test proves a guest sees granted-team deltas and never ungranted ones.

**The lesson.** Authorization must hold on **every transport**, not just the one you remembered.
Tracer S13 (channels), Relay S13 (webhooks), and the capstone's live-update authz are the same lesson:
a connection that outlives a request must re-authorize what it carries.

## Convergence under chaos
Because `applyServerDelta` is idempotent and clients reduce deltas in **seq order**, arrival-order
chaos (reorder, duplication) cannot change the converged state — proved by the shuffle property test in
`store.test.ts`. Delay/drop are handled by lastSeq catch-up.

## Deferred (with plan)
- Per-session mutation rate limiting (token bucket sized to pass a legitimate bulk op).
- Malformed-update rejection + WS-frame fuzzing; secrets scan (gitleaks) in CI.
