#!/usr/bin/env bash
# Tracer — one-time GitHub setup: labels + milestones (+ enable Discussions).
# Prereqs: `gh auth login` done, and you are inside the tracer repo with an `origin` remote.
# Usage:   bash scripts/setup-github.sh
# Safe to re-run: labels use --force; milestone creation tolerates duplicates.

set -uo pipefail

echo "==> Repo: $(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '??? (run inside the repo, after gh auth login)')"

label() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null 2>&1 && echo "  label: $1"; }

echo "==> Creating labels"
# Sprints
for n in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15; do
  label "sprint-$n" "ededed" "Sprint $n"
done
# Phase
label "phase-mvp"  "0e8a16" "Phase 1 — MVP (S01–S05)"
label "phase-full" "1d76db" "Phase 2 — full product (S06–S15)"
# Teaching topics (Tracer-specific)
label "teaching:realtime"      "5319e7" "Real-time / sync engine"
label "teaching:offline"       "5319e7" "Offline-first / optimistic clients"
label "teaching:sync"          "5319e7" "Sync protocol / convergence"
label "teaching:performance"   "fbca04" "Profiling, virtualization, budgets"
label "teaching:security"      "b60205" "Authz, chaos, hardening"
label "teaching:testing"       "0e8a16" "Test strategy / fuzzing"
label "teaching:frontend-arch" "5319e7" "Client state, editor, keyboard UX"
# Process
label "planted-debate" "d93f0b" "A deliberate design debate thread lives on this PR"
label "deferred"       "c5def5" "Deferred work, filed as a linked issue"
label "lab"            "fef2c0" "Post-sprint practice branch/exercise"
label "adr"            "bfd4f2" "Introduces or changes an ADR"
label "good-first-read" "7057ff" "A good PR for the learner to study first"

echo "==> Creating milestones (one per sprint)"
milestone() {
  gh api "repos/{owner}/{repo}/milestones" -f title="$1" -f state=open >/dev/null 2>&1 \
    && echo "  milestone: $1" || echo "  milestone exists/skip: $1"
}
milestone "Sprint 01 — Fast-forward foundation: SPA + API + WS echo"
milestone "Sprint 02 — GitHub OAuth, workspaces, teams, guest scoping"
milestone "Sprint 03 — Issues core: the deliberate 'classic' architecture"
milestone "Sprint 04 — Board, fractional indexing, command palette v1"
milestone "Sprint 05 — Views, E2E, deploy (v0.5.0)"
milestone "Sprint 06 — Sync engine I: mutation log, WS gateway, fanout"
milestone "Sprint 07 — Sync engine II: offline-first client (flagship)"
milestone "Sprint 08 — Undo/redo & optimistic UX (dialogue)"
milestone "Sprint 09 — Comments, mentions, presence"
milestone "Sprint 10 — Filter AST, saved views, cycles"
milestone "Sprint 11 — Search & palette v2"
milestone "Sprint 12 — Performance: virtualization, payloads, budgets"
milestone "Sprint 13 — Hardening: sync chaos, channel authz, load"
milestone "Sprint 14 — Accessibility & keyboard-first polish"
milestone "Sprint 15 — Production readiness (v1.0.0)"

echo "==> Enabling Discussions (for Sprint Recap posts)"
gh api -X PATCH "repos/{owner}/{repo}" -F has_discussions=true >/dev/null 2>&1 \
  && echo "  discussions: on" || echo "  discussions: could not toggle (enable in Settings if needed)"

echo "==> Done. Next: open Sprint 01 (see githelp.md §3)."
