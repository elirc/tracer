# ADR-0008: Durable vs. ephemeral state travel on separate paths

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S09
- **Deciders:** Tracer authors

## Context
Sprint 09 adds two kinds of collaboration state: **comments** (a permanent record) and **presence**
("Ada is viewing ENG", true for a few seconds and worthless after). Both are real-time, but they
have opposite durability requirements. The question is whether they share a pipeline.

## Decision
- **Comments are durable → they ride the mutation log.** A comment is just another synced entity;
  `recordMutation` logs it and fans out a `comment` delta. Clients viewing the team get it live.
- **Presence is ephemeral → a separate, in-memory path.** Presence messages are broadcast over the
  same socket but on a distinct logical channel (an in-process `presenceBus`) and are **never
  written to the mutation log**. Stale viewers simply expire.

## Alternatives considered
- **Put presence in the mutation log too** (uniformity). Rejected: presence is high-churn (a
  heartbeat every few seconds per viewer) and worthless a moment later — logging it would bloat the
  log with millions of "still here" rows an hour, slow every bootstrap, and record data no one will
  ever query. Durability is a *choice per state kind*, not a global policy.

## Consequences
- A whole feature (comments) landed with **zero new sync infrastructure** — the proof that the S06
  spine was worth building. Comments even get undo for free (they're mutations).
- Presence needs its own tiny path, but stays cheap: no persistence, no bootstrap, no history.
- The routing question for any new collaborative state becomes: *does it need to be correct across
  devices and survive a reload?* If yes, the log; if no, an ephemeral channel.

## Links
- `apps/api/src/routes/comments.ts`, `apps/api/src/ws.ts` (presenceBus),
  `apps/web/src/lib/usePresence.ts`, `apps/web/src/lib/useIssueComments.ts`, `docs/sprints/sprint-09.md`
