# Tracer — Sprint Execution Workflow

Same ritual as Meridian, restated here so this folder is self-contained when it becomes its own repo. Each `sprint-NN.md` lists only what is unique to that sprint.

## Roles
- **Author (AI):** all code, commits, PR bodies, teaching comments, and both sides of design debates.
- **Learner (junior):** every sprint — (1) **predict**: read the Phase A issues and write a half-page approach sketch *before* opening the PR; (2) **review-before-reveal**: leave their own review comments on the draft diff before teaching comments are posted; (3) study the merged PR in the prescribed order; (4) complete the post-merge **lab** branch if the sprint has one. From S8 the learner co-authors where the playbook says so.

## Lifecycle (Phases A–G)
- **A — Setup:** milestone, 3–6 issues, branch `sprint-NN/<slug>` from `main`.
- **B — Build:** ordered conventional commits (schema → server → client → tests → docs). `[flaw]` = deliberate, logged in `flaw-ledger.md`, harvested later. `[fix-later-in-PR]` = broken → failing test → fix, visible as a story in branch history.
- **C — Draft PR:** template body with Context/Approach/Tradeoffs/Deferred/Learning objectives/**How to review** (reading order). CI green (unless a red-CI beat is scripted).
- **D — Teaching comments:** 8–20 inline, placed per playbook, *after* the learner's review pass. Prefixes: `📘 concept` · `🔍 review-lens` · `⚠️ pitfall` · `🔗 connects`.
- **E — Planted debate:** question → option arguments → resolution (+ resolution commit and/or ADR when called for).
- **F — Finalize:** curriculum note (`docs/curriculum/sprint-NN.md` with exercise questions), mark ready, squash-merge (`feat(sprint-NN): … (closes #…)`).
- **G — Post-merge:** deploy check (S5+), deferred issues filed, milestone closed, Sprint Recap discussion, **lab branch cut** if scheduled, tags at S5 (`v0.5.0`) and S15 (`v1.0.0`).

## Tracer-specific rules
1. **Fast-forward rule:** anything Meridian already taught gets larger commits and minimal comments; comment density belongs to sync/offline/realtime/perf material.
2. **Latency budget:** from S5, `docs/latency-budget.md` is a contract; S12 adds a CI check. PRs that regress the budget don't merge.
3. **Convergence property:** from S7, "any interleaving of offline edits converges to the same state" is a fast-check-tested invariant; S13 fuzzes it under transport chaos.
4. **Labs:** scheduled after S4, S7, S9, S12, S13 — a `lab/sprint-NN` branch with injected bugs from that sprint's bug classes; the junior finds them with the sprint's own tooling.
5. Conventions otherwise identical to Meridian: squash-only linear `main`, Conventional Commits, no red merges, no force-push after comments, TODOs need linked issues.
