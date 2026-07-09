# Sync Protocol (v1 — Sprint 06)

The wire contract between the sync client and the WebSocket gateway. Types live in
`packages/shared/src/sync.ts`; both sides import them.

## Connect & authenticate
The client opens `ws://…/ws`. The gateway authenticates **at the HTTP→WS upgrade** by reading the
session cookie — before a connection object exists. No valid session → the socket is destroyed.

## Subscribe & bootstrap
```
client → server   { type: "subscribe", workspaceId, lastSeq }
```
The gateway verifies workspace membership, then:
1. Subscribes to the fanout first and **buffers** live deltas.
2. Queries the backlog: all `MutationLog` rows with `seq > lastSeq`, in order, and streams each as a
   `delta`.
3. Flushes any buffered live delta the backlog didn't already cover (this closes the **bootstrap
   gap** — a mutation landing during the backlog query).
4. Sends `{ type: "bootstrap-complete", lastSeq }` and switches to forwarding live deltas directly.

## Live deltas
```
server → client   { type: "delta", delta: { seq, entity, entityId, op, teamId, data } }
```
- `op`: `"create" | "update" | "delete"`. `data` is the serialized entity (create/update) or `null`
  (delete).
- Clients apply deltas **idempotently** (upsert by `entityId`, remove on delete), so replaying on
  reconnect is safe.
- Clients track the max `seq` applied and resume from it on reconnect (catch-up).

## Invariants
- **The log is truth; the fanout is a hint.** A dropped delta is never a lost mutation — the client
  replays from `lastSeq`.
- **Monotonic seq per workspace**, allocated atomically in the write transaction.
- Deltas are published **after** the write commits.

## Known limits (this version)
- Channel authz is workspace-coarse (flaw #4 → S13 adds per-team filtering via `teamId`).
- The client bootstraps issue *state* via REST and uses the log for *live* deltas; the fully
  log-driven offline-first client is Sprint 07.
- Fanout is in-process (single instance); Redis pub/sub is the multi-instance implementation.
