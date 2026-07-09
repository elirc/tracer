# Tracer Sprint Playbooks

Execution scripts for the 15-sprint build of **Tracer** (Linear-class issue tracker — see [SPEC.md](../../SPEC.md)). Course 2 of the clone curriculum; assumes Meridian was studied first.

**Start here:** [00-workflow.md](00-workflow.md) — the ritual, plus Tracer-specific rules (fast-forward, latency budget, convergence invariant, labs).

| Sprint | Playbook | Headline |
|--------|----------|----------|
| 01 | [sprint-01.md](sprint-01.md) | Fast-forward foundation: SPA + API + WS echo |
| 02 | [sprint-02.md](sprint-02.md) | GitHub OAuth, workspaces, teams, guest scoping |
| 03 | [sprint-03.md](sprint-03.md) | Issues core — the deliberate "classic" architecture |
| 04 | [sprint-04.md](sprint-04.md) | Board, fractional indexing, command palette v1 |
| 05 | [sprint-05.md](sprint-05.md) | Views, E2E, deploy → `v0.5.0` |
| 06 | [sprint-06.md](sprint-06.md) | Sync engine I — mutation log, WS gateway, fanout |
| 07 | [sprint-07.md](sprint-07.md) | Sync engine II — offline-first client (flagship) |
| 08 | [sprint-08.md](sprint-08.md) | Undo/redo & optimistic UX (dialogue format) |
| 09 | [sprint-09.md](sprint-09.md) | Comments, mentions, presence |
| 10 | [sprint-10.md](sprint-10.md) | Filter AST, saved views, cycles |
| 11 | [sprint-11.md](sprint-11.md) | Search & palette v2 |
| 12 | [sprint-12.md](sprint-12.md) | Performance: virtualization, payloads, budgets |
| 13 | [sprint-13.md](sprint-13.md) | Hardening: sync chaos, channel authz, load |
| 14 | [sprint-14.md](sprint-14.md) | Accessibility & keyboard-first polish |
| 15 | [sprint-15.md](sprint-15.md) | Production readiness → `v1.0.0` |

**Cross-sprint arcs to watch:** classic → sync-engine migration (S3 → S6/S7, announced in ADR-0002); the mutation lifecycle (optimistic apply S4 → queued+rebased S7 → undoable S8 → fuzzed S13 → traced S15); ordering (fractional index S4 → rebalanced S12); [flaw-ledger.md](flaw-ledger.md).
