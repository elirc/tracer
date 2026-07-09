# Runbook: rollback a bad deploy

**Symptom:** A deploy is live and something is wrong (error spike, SLO burn, broken feature). Default
to rolling back *first* and diagnosing *after* — a rollback is reversible; a debugging session in
production while users suffer is not.

## Preconditions that make rollback safe here
- **Deploys are graceful** (S15): SIGTERM drains WebSockets, clients reconnect to the surviving/rolled-
  back instance and catch up from `lastSeq`. So swapping the running version is a controlled reconnect,
  not an outage.
- **Migrations are the exception.** Code rolls back cleanly; a schema migration may not. This is why
  migrations must be **backward-compatible** (expand/contract): deploy the schema change and the code
  that tolerates both shapes *before* the code that requires the new shape.

## Steps
1. Roll the app image back to the last known-good tag. Watch `ws.connections_*` for the expected
   reconnect blip (that's drain working, not a storm).
2. Confirm `/metrics` `slo.p95WithinBudget` returns to `true` and error rate drops.
3. If a **migration** shipped with the bad deploy: do **not** blindly roll back the schema. Check
   whether the old code tolerates the new schema (it should, if expand/contract was followed). If a
   destructive migration ran, go to [backup-restore.md](backup-restore.md) and treat it as data recovery.

## Do NOT
- Do **not** roll back a schema migration without checking backward compatibility — a `DROP COLUMN` is
  not undone by deploying old code, and restoring a backup reintroduces the seq-divergence trap.
- Do **not** skip the postmortem because "we rolled back and it's fine." Rollback treats the symptom;
  the postmortem finds the cause.
