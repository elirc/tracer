# Curriculum Note — Sprint 07: Offline-First Client (flagship)

## Learning objectives
- Build a client that **boots from disk** (IndexedDB) before the network.
- Apply mutations **optimistically** with a pending overlay, then **rebase** on the server's order.
- Guarantee **exactly-once-in-effect** with a client-generated `mutationId` + server dedupe.
- Prove **convergence** with property tests, not hope.

## Key concepts
- **The overlay model (`@tracer/shared/store.ts`, ADR-0007).** `committed` = server truth;
  `pending` = un-acked local mutations. `materialize` overlays pending on committed. Never mutate
  committed optimistically — this single structure makes rollback (drop from pending) and rebase
  (re-materialize) trivial, and gets the "foreign edit arrives before my ack" case right for free.
- **Exactly-once-in-effect (`routes/issues.ts`).** The client mints a `mutationId`; the server
  dedupes on `(workspaceId, mutationId)`. A create resent because the ack was lost returns the
  existing issue instead of making a second. Ack loss isn't an error — it's weather.
- **Idempotent deltas + convergence.** Because `applyServerDelta` is idempotent and we reduce in
  seq order, two clients that receive the same deltas in any order reach identical committed state.
  That's the property test — the offline-merge guarantee stated as an assertion.
- **Boot from disk (`lib/idb.ts`).** The list appears instantly from IndexedDB, even offline; the
  server fetch reconciles. The client's source of truth at boot is local, not the server.
- **Flaw #1 fully harvested.** No more invalidate-everything anywhere: creates are optimistic +
  deduped, edits stream as deltas, everything patches per-entity.

## Exercise questions
1. You optimistically create an issue, then a *foreign* update to a different issue arrives before
   your create is acked. Walk through `materialize` — why does neither change clobber the other?
2. The create ack is lost and the client resends. Exactly where does the server prevent a duplicate,
   and what would happen without the `mutationId` unique constraint?
3. The convergence property test shuffles the deltas. Why does reducing in *seq* order make arrival
   order irrelevant? Which field would break this if it weren't unique?
4. Kill the network, create three issues, reload the page. What do you see, and why (trace the
   IndexedDB boot path)?

## Further reading
- Optimistic UI & rollback · Local-first software (Kleppmann et al.)
- Idempotency keys / exactly-once-in-effect · Property-based testing of convergence
