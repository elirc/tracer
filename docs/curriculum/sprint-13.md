# Curriculum Note — Sprint 13: Hardening (channel authz, chaos)

## Learning objectives
- Run a **security audit** and fix the top finding: a real cross-team leak on the WebSocket.
- Understand **authz on every transport** — the recurring cross-course lesson.
- See why **convergence under chaos** is already guaranteed by the store's design.

## Key concepts
- **Flaw #4 harvested — the channel leak.** Planted in Sprint 06: the WS gateway checked *workspace*
  membership, then forwarded EVERY team's deltas. A guest scoped to Team A could read Team B's issue
  data straight off the wire — data the REST API refused them. `canSeeDelta` now gates forwarding by
  team access on both the live and backlog paths (`ws.ts`), using the same authz spine as S02.
- **Authz holds on every transport.** A correct REST layer lulls you into thinking the resource is
  protected — but a WebSocket, a webhook, a background job is *also* an API. A connection that
  outlives a request must re-authorize what it carries. (Same lesson as Relay's webhook auth and the
  capstone's live-update authz — three courses, one principle.)
- **Convergence under chaos is free here.** Because `applyServerDelta` is idempotent and clients
  reduce deltas in **seq order**, reordering and duplication can't change the result — proved by the
  shuffle property test (S07). The network is an adversary (drop/dup/reorder is its *normal* behavior
  at scale); the store was built to not care.

## Exercise questions
1. Before the fix, what exactly could a guest read, and how? Which line in `ws.ts` was the leak, and
   why did a correct REST layer hide it for seven sprints?
2. `canSeeDelta` is the same rule as `canAccessTeam`. Why is it important that channel authz reuse the
   REST authz spine instead of a parallel check?
3. Why does arrival-order chaos not affect the converged state? Which two properties of the store make
   that true?

## Deferred (with plan, in the audit)
- Per-session mutation rate limiting (token bucket), malformed-frame rejection + WS fuzzing, gitleaks
  in CI, session rotation on privilege change.

## Further reading
- Authorization on every transport (defense in depth) · IDOR / broken object-level authorization
- Chaos engineering for real-time systems · Idempotent consumers
