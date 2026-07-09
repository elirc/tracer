# Sprint 15 — Production Readiness → v1.0.0

**Branch:** `sprint-15/production-readiness` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Operate a stateful real-time system: sync-specific observability (lag, queue depth, convergence health), tracing the mutation lifecycle end-to-end, graceful WS drain on deploy, an incident drill (Redis pub/sub loss mid-collaboration), runbooks, and the v1.0 release with the course retrospective.

## A — Issues
1. `Observability: mutation-lifecycle tracing, sync metrics, Sentry with offline-queue context`
2. `Alerting: sync-lag SLO, WS churn, queue backlog, error spikes`
3. `Ops: graceful WS drain on deploy, session resumption, backup/restore drill`
4. `Runbooks + incident drill (Redis pub/sub outage mid-collab)`
5. `Release: changelog, v1.0.0, course retrospective`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(api): mutation-lifecycle tracing — mutationId spans client-send → apply → fanout → foreign-client-apply` | one trace answers "why was my edit slow for my teammate?"; client timings shipped via beacon |
| 2 | `feat(api): sync metrics — fanout lag p95, connections, per-workspace mutation rate, queue depths` | dashboard JSON committed |
| 3 | `feat(web): sentry with sync context — connection state, pending-queue length, lastSeq in every event` | offline-first bug reports are undebuggable without queue state; PII scrub (no issue titles in breadcrumbs) |
| 4 | `feat(api): graceful deploy — WS drain: stop accepting, notify clients, clients reconnect to new instance` | clients treat drain as ordinary reconnect (S7 built this muscle); zero-downtime deploy verified with a mid-edit E2E |
| 5 | `feat(api): alerting — sync-lag SLO burn, reconnect storms, DLQ growth, error rate` | SLO: p95 mutation→foreign-apply < 500ms (from S13 baseline) |
| 6 | `feat(ops): backup + tested restore — MutationLog is the crown jewel; restore drill on staging` | restore then convergence smoke: clients with newer lastSeq than the restored log — the nasty case, handled (forced re-bootstrap on seq regression) |
| 7 | `docs: runbooks — sync lag, reconnect storm, seq divergence, stuck client queues, restore, rollback` | |
| 8 | `test(drill): incident — kill redis pub/sub mid-collaboration on staging` | executed for real: fanout hints die, clients keep working (log-is-truth!), catch-up on reconnect proves the S6 design sentence |
| 9 | `docs: postmortem — redis loss (blameless); action items as issues` | headline finding: no alert existed for "fanout dead but api healthy" — added |
| 10 | `fix(api): fanout-liveness alert + redis reconnect backoff (drill action item)` | |
| 11 | `chore(release): changelog from conventional commits; staging/prod docs; README refresh` | |
| 12 | `docs: course retrospective — competency map revisited, spine-dividend tally, v2 ideas (GitHub integration, mobile, text CRDT)` | |

## C — Review order
The trace (1) — follow one mutation across four systems → drain (4) → the drill story (8→9→10).

## D — Teaching comments (~9)
- mutation-lifecycle trace — 📘 distributed tracing for a *client-inclusive* system; the client is a first-class service in the trace; clock skew handling for client spans
- sync-lag SLO — 📘 the metric users feel: not server latency but *my edit on your screen*; percentiles across workspaces, not global averages
- sentry queue context — 🔍 review-lens: the three fields (connection state, queue length, lastSeq) that turn "weird sync bug" reports into diagnoses
- drain-as-reconnect — 🔗 S7's reconnect discipline makes deploys free; systems that handle failure handle maintenance
- seq-regression on restore — ⚠️ restoring a DB *backwards in time* under clients that remember the future; detection (client lastSeq > server max) and the forced re-bootstrap answer; most teams meet this in production first
- drill result — 📘 "log is truth, pub/sub is a hint" was written in S6 and *proven* here — architecture sentences should be testable claims

## E — Debate
**"Redundant pub/sub (Redis Sentinel/cluster) vs accept degraded-mode?"** Redundancy: fewer incidents. Degraded-mode: the drill proved clients survive fanout loss with reconnect catch-up; Sentinel adds ops weight this scale doesn't justify. **Resolution:** degraded-mode + the new liveness alert; written trigger (sustained multi-instance scale or SLO burn from fanout gaps). Lesson: *a proven degradation path can be worth more than redundancy.*

## F/G — Close & Release
- Squash: `feat(sprint-15): observability, ops hardening, incident readiness (closes #…)`
- **Release sequence:** merge → deploy → smoke → tag **`v1.0.0`** → GitHub Release → extended demo (offline two-device demo recorded) → close milestone.
- Final discussion: **course retro** — the classic→sync migration arc reviewed end-to-end; learner writes their own "what I'd build differently"; pointer to course 3 (Pulse).
- Recap idea: *you don't operate a real-time system by watching servers — you watch the promise: everyone converges, quickly.*
