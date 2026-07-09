# Runbook: seq divergence (client `lastSeq` ahead of server max)

**Symptom:** A client sends `subscribe` with a `lastSeq` **greater** than the server's current max
`seq` for that workspace. The backlog query `seq > lastSeq` returns nothing, so the client waits
forever for updates that (from its perspective) already happened. This is the nastiest sync bug, and
it almost always means **the database was restored backwards in time**.

## Cause model
Time only moves forward in a mutation log — until someone restores a backup. Restore the DB to an
earlier point and the server's max `seq` drops *below* what live clients already remember. The client
holds a receipt for a future the server has forgotten.

## Detection
- Compare client `lastSeq` (in its error report / `/metrics` beacon context) against the server max.
- `client.lastSeq > server.maxSeq(workspace)` ⇒ divergence.

## Fix: forced re-bootstrap on seq regression
The client must **discard its optimistic view and re-bootstrap from 0** when it detects the server has
regressed. Concretely: if a subscribe yields a `bootstrap-complete` with `lastSeq < ourLastSeq`, treat
it as a regression, clear the local overlay's committed state, reset `lastSeq = 0`, and re-subscribe.
Losing local *pending* mutations is acceptable here — the alternative is permanent silent divergence.

## Prevention
- After any restore, **bump the workspace `mutationSeq` past the highest seq any client could hold**, or
  force all clients to re-bootstrap (a version epoch). See [backup-restore.md](backup-restore.md).

## Do NOT
- Do **not** hand-edit `seq` values to "catch up" the server — you'll create duplicate seqs and violate
  the `@@unique[workspaceId, seq]` invariant that the whole convergence guarantee rests on.
