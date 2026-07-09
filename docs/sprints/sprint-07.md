# Sprint 07 — Sync Engine II: The Offline-First Client (Flagship)

**Branch:** `sprint-07/offline-client` · **Size:** XL · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** The flagship. A normalized client store persisted in IndexedDB, an outbound mutation queue with client-generated ids, optimistic apply with server rebase, reconnect catch-up, and per-field LWW conflict resolution — proven by convergence property tests. TanStack Query retires from the issue domain.

## A — Issues
1. `packages/store: normalized in-memory store + Dexie persistence`
2. `Outbound mutation queue: optimistic apply, persist, send, ack, rebase`
3. `Client-generated mutationId: exactly-once-in-effect on the server`
4. `Conflict resolution: per-field LWW with seq as the clock`
5. `Convergence property tests + two-device offline E2E`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(store): normalized store — entity maps, reactive subscriptions, selector hooks` | framework-agnostic core + thin React binding |
| 2 | `feat(store): dexie persistence — write-through, boot-from-disk before network` | app boots usable from IndexedDB; snapshot + lastSeq stored |
| 3 | `feat(store): outbound queue — mutations persisted before send, FIFO replay` | survives tab close mid-flight |
| 4 | `feat(store): optimistic apply + pending overlay` | committed state vs pending mutations kept separate — the overlay model, the sprint's key data structure |
| 5 | `feat(api): mutation dedupe by client mutationId` | **[in-PR arc]** commit 4's queue re-sends on reconnect; test in commit 6 shows duplicate application server-side; this commit adds unique(mutationId) + idempotent apply |
| 6 | `test(api): resend after ack-loss → applied once` | the arc's proof; body: "ack loss is not an error, it's weather" |
| 7 | `feat(store): ack/rebase — server mutation stream confirms or rebases pending ops` | on ack: drop from overlay; on foreign mutation touching same field: LWW by seq |
| 8 | `feat(store): reconnect — send queue, then bootstrap-from-lastSeq, then live` | ordering matters and is documented in the protocol doc |
| 9 | `refactor(web): issue domain reads/writes → packages/store` | TanStack removed for issues; **flaw #1 fully harvested** — ledger quoted |
| 10 | `feat(store): client-side keyBetween for offline reorders` | 🔗 the S4 promise lands: clients now invent order keys; collisions resolved by LWW — and the growth problem compounds (flaw #2 gets worse, silently) |
| 11 | `test(store): convergence properties — random op interleavings across N simulated clients converge` | fast-check simulator: generate ops, partition, heal, assert equal state — the course's crown-jewel test |
| 12 | `test(e2e): two-context offline — both edit same issue offline, reconnect, converge` | Playwright `context.setOffline` |
| 13 | `docs: sync protocol doc v2 (client lifecycle state machine); ADR-0007 overlay model; curriculum note` | |

## C — Review order
Overlay model (4) → dedupe arc (5→6) → rebase (7) → reconnect ordering (8) → convergence test (11) — then the refactor (9) as the payoff.

## D — Teaching comments (~14)
- boot-from-disk — 📘 the offline-first inversion: network is an enhancement, disk is the source at boot; perceived-perf side effect (instant loads)
- queue-before-send — ⚠️ persist the intent *before* the network call or a crash eats user work; write-ahead logging in miniature
- overlay model — 📘 never mutate committed state optimistically — overlay pending on top; rollback becomes "remove from overlay," rebase becomes recompute; this one structure prevents a whole bug family
- mutationId dedupe — 🔗 Meridian S7 idempotency, now client-driven; the id is minted where the intent is born
- ack vs foreign mutation — 📘 the rebase decision table: my-ack / foreign-same-field / foreign-other-field — three cases, spelled out
- reconnect ordering — ⚠️ queue-flush before bootstrap, or your own offline edits get LWW'd by your own stale reads; subtle and catastrophic if flipped
- convergence property test — 📘 how to *state* eventual consistency as a testable property; the simulator's op generator is half the value
- LWW timestamps — ⚠️ wall clocks lie (skew); seq is the clock — assigned by the server, total order for free
- client keyBetween — 🔍 review-lens: what happens when two offline clients insert at the same slot? (exercise question; answer: keys collide → LWW picks one, other's *intent* survives as adjacent — good enough for boards, and why text needs CRDTs)

## E — Debate
**"Full store replacement vs keep TanStack for non-synced data?"** Purity: one data layer. Pragmatism: settings pages, membership admin, auth — request/response data with no offline story — TanStack remains perfect there. **Resolution:** store for synced entities, TanStack for the rest; the boundary is "does it live in the mutation log?" Lesson: *architectures coexist; migrate the domain that needs it.*

## F/G — Close
- Squash: `feat(sprint-07): offline-first client — store, queue, rebase, convergence (closes #…)`
- **Lab:** `lab/sprint-07` — three bugs: reconnect order flipped, an overlay leak (acked mutation not dropped), dedupe missing on one mutation type. Find via the convergence simulator.
- Ledger: flaw #1 closed; flaw #2 annotated "now client-amplified."
- Recap idea: *offline-first is a discipline of intent: persist it, replay it, dedupe it, rebase it.*
