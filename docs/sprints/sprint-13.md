# Sprint 13 — Hardening: Sync Chaos, Channel Authz & Load

**Branch:** `sprint-13/hardening` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Audit-first security + resilience sweep with the sync engine as the attack surface: transport chaos against the convergence invariant, per-team channel authz (the big planted leak), mutation-level rate limiting, and a 5k-connection load test. **The learner runs the audit tooling and drafts the findings doc; the AI verifies, extends, and fixes.**

## A — Setup (audit before code)
Learner runs: the S7 convergence simulator under a new chaos harness, a WS authz probe script (guest credentials subscribing everywhere), k6 WS load scenario, `pnpm audit` + gitleaks, and a review of `teamScope()` call-site coverage. Findings doc `docs/audits/sprint-13-audit.md` is commit 1 — learner-drafted, AI-annotated (both voices visible).

## B — Commits (one finding per commit)
| # | Commit | Notes |
|---|--------|------|
| 1 | `docs: sprint-13 audit — findings P1..P4 (learner-drafted, AI-annotated)` | |
| 2 | `security(api): per-team sync channels (P1) — guests receive only granted teams' deltas` | **harvests flaw #4**; the probe transcript in the body shows a guest reading a private team's issue titles from raw WS frames — the course's scariest artifact |
| 3 | `test(api): channel leak regression — guest probe across all message types incl. presence` | presence leaked too (S9 lab foreshadowed it) |
| 4 | `feat(test): transport chaos harness — drop/duplicate/reorder/delay WS frames (P1)` | wraps the convergence simulator; convergence must hold under chaos |
| 5 | `fix(store): reorder tolerance — buffer out-of-seq mutations, apply in order (P1)` | chaos harness found it: live deltas arriving before bootstrap completion were applied out of order |
| 6 | `security(api): mutation rate limiting per session + payload size caps (P2)` | a hostile client can't flood the log; oversized patch rejection |
| 7 | `security(api): mutation schema hardening — server revalidates every patch field (P2)` | never trust the client store; zod on the way in, always |
| 8 | `test(load): k6 ws scenario — 5k connections, 50 mutations/s; baseline doc (P2)` | connection memory, fanout CPU, Redis throughput measured; capacity doc |
| 9 | `perf(api): fanout hot path fix from load test (P2)` | per-message JSON.stringify per connection → serialize once per channel |
| 10 | `security(ci): gitleaks + dependency audit gates (P3, fast-forward)` | |
| 11 | `docs: threat model — the sync engine (spoofed clients, replay, cross-team leakage, resource exhaustion)` | STRIDE-lite, learner co-authored |
| 12 | `docs: curriculum note sprint 13` | |

## C — Review order
Audit doc → the leak arc (2–3, read the probe transcript) → chaos harness + reorder fix (4–5) → load baseline (8–9).

## D — Teaching comments (~10)
- probe transcript — 📘 authz must be enforced at the *channel*, not just the REST layer; every transport is an API; 🔗 flaw #4 ledger quote — planted in S6, silent for 7 sprints, exactly how real leaks age
- presence leak — 🔍 review-lens: new state paths (S9's ephemeral channel) inherit no security by default; every path needs its own authz review
- chaos harness — 📘 the network is an adversary: drop/dup/reorder is its normal behavior at scale; invariant tests + chaos = confidence no unit test gives
- out-of-seq buffer — ⚠️ the bug class: "works on localhost" ordering assumptions; seq gives us detection for free — we just weren't using it defensively
- server revalidation — 📘 the client store is a convenience, not a authority; symmetry rule: every mutation validated twice, trusted once
- serialize-once fanout — 🔍 profiling under load finds what code review can't; O(connections) stringify was invisible at 5 clients
- learner-run audit — 📘 the meta-lesson: the audit methodology transferred; compare this findings doc to Meridian S13's

## E — Debate
**"Rate limit by mutations/second vs token bucket with burst?"** Flat rate: simple, punishes legitimate bulk ops (S8!). Token bucket: bursts allowed, sustained abuse capped. **Resolution:** token bucket sized so a 500-issue bulk op passes but a flood doesn't; the S8 batch-mutation type helps (one mutation, N patches). Lesson: *rate limits must be designed against your own legitimate extremes.*

## F/G — Close
- Squash: `fix(sprint-13): sync hardening — channel authz, chaos tolerance, load (closes #…)`
- **Recap reveals the full flaw ledger** (Tracer edition) — which findings were planted vs emergent.
- **Lab:** `lab/sprint-13` — the chaos harness with one new injected client bug (ack handling under duplication); learner must localize it from convergence-failure output alone.
- Ledger: flaw #4 closed; ledger fully harvested.
- Recap idea: *real-time systems are attacked by physics before hackers — reorder, duplication, and delay are your first adversaries.*
