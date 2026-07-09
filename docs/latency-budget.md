# Latency Budget

Performance is a contract with numbers, not a vibe. These are the interaction budgets Tracer holds
itself to. They're **instrumented now** (`apps/web/src/lib/perf.ts`, Performance API marks) and
become a **CI gate in Sprint 12** (a Playwright perf spec fails the build on regression).

| Interaction | Budget | Why |
|---|---|---|
| Keyboard action → paint (state change, priority) | **< 100 ms** | Feels instant; the product's core promise |
| Command palette open (Cmd+K → visible) | **< 50 ms** | Must feel like it was already there |
| Route/view change (list ↔ board) | **< 200 ms** | Perceived as immediate navigation |
| Per-frame work during drag | **< 16 ms** | One frame at 60 fps; anything more drops frames |

## How they're measured
- `startMark(name)` / `measureSync(name, budgetMs, fn)` wrap interactions and log (in dev) when a
  budget is blown.
- Sprint 12 converts these into a CI-enforced check with a 10k-issue seed and a 3-run median (perf
  tests flake; medians + generous margins tame it), separating hard-fail *budgets* from warn-only
  *regression watch*.

## The point
You can't optimize what you never measured. Instrumenting in Sprint 5 — when everything is fast and
small — is what gives Sprint 12 the before/after evidence to prove its optimizations, and stops
performance from silently rotting in between.
