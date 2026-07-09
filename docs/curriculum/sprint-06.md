# Curriculum Note — Sprint 06: Sync Engine I (the server spine)

## Learning objectives
- Turn every write into a **sequenced fact** (a mutation log) and stream those facts to clients.
- Own the **HTTP→WS upgrade** and authenticate there.
- Design a **bootstrap protocol** (catch up from `lastSeq`, then live) and close its gap.
- Understand "**the log is truth; the fanout is a hint**" — the sentence the whole engine rests on.

## Key concepts
- **The single write path (`lib/mutations.ts`).** `recordMutation` assigns a monotonic per-workspace
  `seq` atomically, records the mutation, and fans out the delta. The REST handlers are now thin
  wrappers — every issue write also emits a delta. (Same seq-race lesson as issue identifiers, one
  layer down.)
- **Log is truth; fanout is a hint (ADR-0006).** Delivery may fail; recovery is always "replay from
  `lastSeq`". So a dropped publish is never a lost mutation, and we can publish *after* commit
  without risking a client seeing rolled-back state.
- **Auth at upgrade (`ws.ts`).** We handle the upgrade ourselves and check the session cookie before
  a connection exists — the choke point where every socket is born.
- **The bootstrap gap.** A mutation landing *during* the backlog query would be missed if you queried
  then subscribed. Fix: subscribe (and buffer) first, then query, then flush anything the backlog
  didn't cover. Read `handleSubscribe` for the buffer dance.
- **Idempotent delta application (`useTeamIssues.ts`).** Upsert by `entityId`; remove on delete.
  Because application is idempotent, replaying deltas on reconnect (or bootstrapping from seq 0) is
  safe — no dedup bookkeeping needed yet.
- **Flaw #1 harvested (partially).** The client no longer refetches the whole list on a mutation; the
  delta patches the specific entity, live, for every connected client. Open two browser windows and
  drag a card — it moves on both. Full offline-first (local store, optimistic apply, rebase) is S07.

## Exercise questions
1. A client disconnects for 30 seconds while 5 issues change, then reconnects. Exactly how does it
   catch up without re-fetching everything? Which field makes that possible?
2. Why do we publish the delta *after* the transaction commits, not inside it?
3. Trace the bootstrap gap: what would be lost if `handleSubscribe` queried the backlog *before*
   subscribing to the fanout? Why does buffering-first fix it?
4. A GUEST with access to only Team A subscribes to the workspace. What deltas do they receive right
   now, and why is that a bug (flaw #4)? What field will Sprint 13 use to fix it?

## Further reading
- Event sourcing / append-only logs · WebSocket upgrade (RFC 6455 §4)
- At-least-once delivery + idempotent consumers · Redis pub/sub
