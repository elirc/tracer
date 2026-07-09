# Sprint 06 — Sync Engine I: The Server Spine

**Branch:** `sprint-06/sync-server` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** The mutation log, workspace-monotonic sequence numbers, an authenticated WebSocket gateway with subscribe/bootstrap/delta protocol, and Redis fanout across instances. The client stays on TanStack Query but now receives live deltas — the classic architecture gets real-time before it gets replaced.

## A — Issues
1. `MutationLog: every write becomes a logged, sequenced mutation`
2. `WS gateway: auth at upgrade, subscribe(workspace), bootstrap + live deltas`
3. `Redis pub/sub fanout (multi-instance correctness)`
4. `Client: apply deltas to the query cache (targeted patch, not invalidate-everything)`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(db): MutationLog — workspaceId, seq, clientId, mutationId, entity, patch, ts` | seq monotonic per workspace |
| 2 | `refactor(api): write path — all issue-domain writes go through applyMutation()` | one write path (Meridian S4's lesson at architecture scale); REST handlers become thin wrappers |
| 3 | `feat(api): seq assignment — [naive read-max+1 inside applyMutation]` | **[fix-later-in-PR]** |
| 4 | `test(api): parallel mutations → duplicate seq, FAILS` | |
| 5 | `fix(api): seq via per-workspace counter row in the same tx` | gap-free, ordered, crash-safe; body compares Postgres sequences (gaps) vs counter row |
| 6 | `feat(api): ws auth at upgrade + subscribe(workspaceId) with membership check` | **[flaw #4]** channel authz is workspace-coarse — guests receive deltas for teams they can't read (harvest S13) |
| 7 | `feat(api): bootstrap protocol — client sends lastSeq, server streams missed mutations then live` | the catch-up contract: `subscribe → {mutations since lastSeq} → live` |
| 8 | `feat(api): redis pub/sub fanout — publish after commit, per-instance delivery` | ⚠️ publish-after-commit ordering; what happens if publish fails (clients catch up via lastSeq — the log is truth, pub/sub is only a hint) |
| 9 | `feat(web): delta consumer — patch TanStack cache per-entity from mutations` | invalidate-everything dies; commit body shows refetch count before/after (flaw #1 partially harvested; full harvest is S7) |
| 10 | `test(api): bootstrap gap test — mutations during connect window not lost` | the classic reconnect race: subscribe, then log advances before live attach |
| 11 | `test(e2e): two-browser — move issue in one, board updates in the other` | |
| 12 | `docs: ADR-0006 LWW mutation log over CRDT; sync protocol doc; curriculum note` | protocol doc = message shapes, sequence diagrams, invariants |

## C — Review order
ADR-0006 → applyMutation refactor (2) → seq arc (3→4→5) → bootstrap protocol (7) → gap test (10).

## D — Teaching comments (~12)
- applyMutation — 📘 the log *is* the product now; REST becomes one client of the write path among (soon) many
- seq arc — 🔍 review-lens: third appearance of the sequence-race class (Meridian invoices, Tracer identifiers); the learner should have called it in prediction
- log-is-truth, pubsub-is-hint — 📘 the load-bearing design sentence of the whole engine: delivery may fail; recovery is always "replay the log from lastSeq"
- bootstrap gap test — ⚠️ the subscribe/attach race everyone ships; why the server snapshots lastSeq inside the subscription lock
- patch-vs-invalidate — 📘 the mutation log gives us *semantic* cache updates; refetch storms end
- publish-after-commit — ⚠️ publishing inside the tx announces uncommitted state; after-commit risks a dropped hint — acceptable *only because* of the catch-up contract
- workspace-coarse subscribe — *(no comment — flaw #4 stays silent)*

## E — Debate
**"CRDT vs LWW mutation log?"** CRDT: automatic convergence, no server arbitration. LWW log: server-ordered, simple mental model, natural audit trail; per-field LWW is fine for issue metadata (title, state, assignee) where "last edit wins" matches user intent. **Resolution:** LWW mutation log — CRDTs earn their complexity for *collaborative text* (that's Folio, course 5); issue trackers are field-granular. → ADR-0006, the course's central ADR.

## F/G — Close
- Squash: `feat(sprint-06): sync engine server — mutation log, ws gateway, fanout (closes #…)`
- Deferred: client offline queue (S7, by design), delta compression (S12).
- Ledger: flaw #4 recorded; flaw #1 marked *partially harvested*.
- Recap idea: *a sync engine is a log plus a promise: "tell me what I missed since seq N."*
