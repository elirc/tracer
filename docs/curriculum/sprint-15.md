# Curriculum Note — Sprint 15: Production readiness → v1.0.0

## Learning objectives
- Instrument a **stateful, real-time** system: what to measure, and why the usual metrics mislead.
- Trace a mutation across **four systems including the browser**, and handle client clock skew.
- Operate a system whose correctness survives infra loss: **incident drill → postmortem → fix**.
- Ship a release: changelog, tag, and an honest **course retrospective**.

## Key concepts
- **Measure the promise, not the process.** A real-time app's health is not "is the server up" — it's
  "does everyone converge, quickly." The SLO is **p95 mutation-commit → foreign-client-apply < 500ms**,
  and `/metrics` exposes `slo.p95WithinBudget` as a boolean an alert can page on. The fanout drill
  proved why: the server was green while the promise was broken (`docs/postmortems/`).
- **Percentiles, never averages** (`latency.ts`). The metric users feel is a distribution with a long
  tail. An average of 245ms can hide a p95 of 2000ms — five users watching a spinner while ninety-five
  are fine. SLOs are always phrased on the tail.
- **The client is a service in the trace** (`trace.ts`). A mutation's life spans client → server →
  fanout → *foreign* client. The trap a pure-server trace never hits: client timestamps come from
  clocks we don't control, and browser wall-clocks drift by seconds. We estimate each client's offset
  (NTP-style, three timestamps) and correct before subtracting — otherwise a client whose clock is 5s
  fast reports its teammate's edit arriving *before it was sent*.
- **Offline-first bug reports need queue state** (`redact.ts`). "It didn't save" is undebuggable
  without three fields: connection state, pending-queue length, and `lastSeq`. And because reports go
  to a third party (Sentry), user content — issue titles, comment bodies — is scrubbed at the trust
  boundary, not later.
- **Drain-as-reconnect makes deploys free** (`ws.ts`, `index.ts`). On SIGTERM we tell clients we're
  draining and let them reconnect elsewhere. We built that reconnect discipline in S07 for network
  drops; a deploy is just a controlled version of the failure we already survive. **Systems that
  handle failure handle maintenance.**
- **A proven degradation path can beat redundancy** (ADR-0012). The drill showed clients survive fanout
  loss, so we added an *alert* instead of Redis Sentinel's ops weight. Test the failure and you may find
  you don't need to prevent it — you need to observe it.
- **The seq-regression trap** (`docs/runbooks/seq-divergence.md`). Restore the DB backwards in time and
  clients hold a `lastSeq` from a future the server forgot. Detection: `client.lastSeq > server.maxSeq`.
  Answer: forced re-bootstrap. Most teams meet this in production first; you met it in a runbook.

## Exercise questions
1. The `/metrics` SLO reports healthy on an empty sample. Argue both sides: why is "no data = healthy"
   the right call, and when would it bite you?
2. Walk through `lifecycle()` with a foreign client whose clock is 3s behind the server. What does the
   naive (uncorrected) end-to-end latency read, and why is it nonsense?
3. Why does a deploy *without* graceful drain risk a reconnect storm, while a deploy *with* drain does
   not? What role do backoff and jitter play?
4. Fanout is dead but `/health` is green. Which runbook, and what is the one thing you must not restart?

## The spine dividend, cashed
Every "expensive" foundation from the first half paid out here: the **mutation log** (S06) made fanout
loss survivable; **reconnect** (S07) made deploys free; the **overlay store** (S07) made the client a
first-class trace participant; **percentiles** made the SLO honest. Production readiness wasn't bolted
on in S15 — it was *earned* in S06–S07 and *collected* in S15.

## Deferred / real-world gaps (named honestly)
- Real Prometheus/OTel export, Redis-backed fanout + Sentinel decision revisited at scale, distributed
  tracing backend (Jaeger/Tempo), load testing at 10k concurrent, and the client-beacon that feeds
  `observeFanoutLagMs`. The *shapes* are built and tested; wiring them to real infra is the next repo.

## Further reading
- Google SRE Book: SLIs/SLOs/error budgets · "Nines don't matter if users aren't happy"
- NTP clock synchronization · Blameless postmortems · Expand/contract migrations · Chaos engineering
