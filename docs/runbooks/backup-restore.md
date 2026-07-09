# Runbook: backup & restore

**The `MutationLog` is the crown jewel.** It is the source of truth from which every client's state is
derived. Back it up like it's the only thing that matters, because for convergence it is.

## Backup
- Point-in-time recovery (PITR) on the Postgres primary; verify WAL archiving is healthy.
- A backup you have never restored is a hypothesis, not a backup. Run the restore drill on staging on a
  schedule — we do it every release (S15).

## Restore drill (staging)
1. Restore the snapshot to a fresh staging DB.
2. Run the **convergence smoke test**: point clients at it and confirm they bootstrap and converge.
3. **Then run the nasty case** (this is the whole point of the drill):

## The trap: restoring backwards in time under live clients
If you restore to an earlier point while clients still hold a newer `lastSeq`, you get **seq
divergence** — clients remember a future the server has forgotten. See
[seq-divergence.md](seq-divergence.md). Detection: `client.lastSeq > server.maxSeq`.

**Handling:** after a restore, force clients past the discontinuity. Either:
- bump the workspace `mutationSeq` beyond any seq a client could plausibly hold, or
- publish a **version epoch** bump that makes every client discard local state and re-bootstrap from 0.

Losing in-flight *pending* mutations on the affected clients is the accepted cost; silent permanent
divergence is not acceptable.

## Do NOT
- Do **not** restore production in place without a plan for live clients' `lastSeq`. "The data is back"
  is only half the job; the other half is the fleet of clients that remember the future.
