# Learner Guide — How to Study Tracer

Welcome. **Tracer is a course disguised as a codebase.** It's a from-scratch build of a Linear-class
issue tracker, delivered as 15 pull requests. You are not here to write the code — the PRs are already
authored, heavily annotated, and merged. You are here to **read them the way a senior engineer reads a
teammate's work**, and to graduate from "can make it work" to "can make it good."

This is Course 2 of a larger curriculum. Its signature subject is the hardest thing in front-end-heavy
product engineering: **real-time collaboration** — sync engines, offline-first clients, WebSockets, and
keyboard-driven UX performance. Its central arc: we build the app as a *classic* REST + query-cache web
app (Sprints 1–5), then **migrate it to a local-first sync engine** (Sprints 6–7). You watch a senior
team replace an architecture under a live product. That's the most valuable thing here.

---

## The one rule that makes this work

**Observation is the weakest form of learning.** Reading a beautiful PR feels productive and teaches
almost nothing if you stay passive. So for every sprint, do these three active moves:

1. **Predict before reading.** Open the sprint's issues (the GitHub milestone) and the top of
   `docs/sprints/sprint-NN.md`. Before looking at the diff, write half a page: what schema, what
   endpoints, what the tricky part will be, what bug you'd expect. *Then* read the PR. The gap between
   your plan and the senior's is where the learning actually lives.
2. **Review before the reveal.** Read the diff and leave your *own* review comments (mentally or in a
   scratch file) — what would you flag? *Then* read the placed teaching comments and compare. This
   trains the reviewer's eye, which is the mid-to-senior skill.
3. **Do the lab.** Sprints with a `lab/sprint-NN` branch have bugs injected from that sprint's own bug
   classes. Find them using the sprint's own tooling (tests, the convergence fuzzer, the profiler) —
   not by eyeballing. This is where knowledge becomes skill.

---

## How to read a single PR

Every PR has a **"How to review this PR"** section that gives you a file reading order. Follow it — it's
not the order the files appear in the diff, it's the order that tells the story (usually: schema →
server → client → tests → docs). Watch for:

- **Teaching comments**, tagged by intent:
  - `📘 concept` — a pattern or principle
  - `🔍 review-lens` — what a senior checks right here
  - `⚠️ pitfall` — the bug class this code avoids
  - `🔗 connects` — a link to an ADR, an earlier sprint, or a future one
- **The commit sequence.** Read commits in order — several sprints deliberately commit a bug, then a
  failing test that exposes it, then the fix. That red→green arc *is* the lesson. Don't skip to the end.
- **The planted debate.** Each PR has a design-decision thread with both sides argued and a resolution.
  Read the losing side charitably; if you can't explain why it lost, you haven't learned the decision.
- **The ADRs** in `docs/adr/` — the durable "why" behind the architecture.

---

## The flaw ledger (don't peek too early)

`docs/sprints/flaw-ledger.md` lists imperfections planted on purpose in early sprints and harvested
later (a missing index, an unbatched update, a coarse authz check). It's written to stay
"author-private until the Sprint 13 recap." **Try to spot the flaws yourself as you read** before you
consult the ledger — that's the exercise. Discovering a planted flaw in Sprint 3 that bites in Sprint 13
is the whole point.

---

## Pace and cadence

- **One sprint per 1–2 weeks.** Bingeing all 15 in a weekend produces recognition, not skill.
- After each sprint, write a short **teach-back**: explain the sprint's one big idea and the ADR's
  losing side in your own words. If you can't, re-read.
- Track yourself against the competency matrix in `SPEC.md` §4 — score yourself before Sprint 1 and
  again after Sprint 15. The delta is the point.

---

## Your role rises over the course

- **Sprints 1–7:** you're an observer/predictor/reviewer.
- **Sprint 8 (dialogue format):** you co-author the "junior" implementation; the AI's review of your
  code is the teaching artifact. This is where reading becomes writing.
- Later courses push this further — by the capstone (Folio), you co-author throughout and the AI mostly
  reviews. Observer → author → peer is the whole arc of the curriculum.

---

## Where things live

- `SPEC.md` — the product spec, tech stack, and competency matrix
- `docs/sprints/README.md` — the sprint index and the cross-sprint arcs to watch
- `docs/sprints/00-workflow.md` — the ritual every sprint follows
- `docs/sprints/sprint-NN.md` — the playbook for each sprint (what the PR does and teaches)
- `docs/adr/` — architecture decision records
- `docs/curriculum/sprint-NN.md` — per-sprint learning objectives + exercise questions (added as each
  sprint merges)

Start at `docs/sprints/README.md`, then read the Sprint 01 PR. Predict first.
