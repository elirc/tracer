# Runbooks

Operational playbooks for Tracer in production. A runbook is written for the person paged at 3am who
did **not** build the system: it states the symptom, the checks in order, the fix, and — crucially —
what *not* to do. If you find yourself improvising during an incident, that's a runbook that needs a
new section afterward.

> **Golden rule for this system:** the `MutationLog` is truth; the fanout (pub/sub) is a hint. Almost
> no incident is worth touching the log. When in doubt, restart the *hint*, never the *truth*.

| Runbook | Symptom |
|---------|---------|
| [sync-lag.md](sync-lag.md) | Edits are slow to appear on teammates' screens (SLO burn) |
| [reconnect-storm.md](reconnect-storm.md) | A spike of WebSocket reconnects / CPU / connection churn |
| [fanout-down.md](fanout-down.md) | Live updates stopped but the API is "healthy" |
| [seq-divergence.md](seq-divergence.md) | A client's `lastSeq` is ahead of the server's max seq |
| [backup-restore.md](backup-restore.md) | Restoring the database (incl. the "restore backwards in time" trap) |
| [rollback.md](rollback.md) | A deploy is bad and must be reverted |

## Escalation
- **P1** (data at risk, or all clients down): page the on-call, open an incident channel, and start a
  timeline. Write a blameless postmortem after (`docs/postmortems/`).
- **P2** (degraded, users working): fix, then file follow-ups as issues.

## After every incident
Write the postmortem the same day, blameless, with action items filed as issues. The headline question
is always: *what alert would have caught this sooner?* (That question is what turned the S15 fanout
drill into a real improvement — see the postmortem.)
