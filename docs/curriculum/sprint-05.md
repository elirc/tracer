# Curriculum Note — Sprint 05: Views, E2E, Deploy → v0.5.0

## Learning objectives
- Compose canned **views** from the primitives built so far (My Issues, active/backlog).
- Finish the **UX skeleton**: the three states every async surface needs (loading / empty / error).
- Write a **performance contract** (the latency budget) and instrument it before you need it.
- Understand the shape of **shipping**: demo seed, E2E strategy, deploy scaffolding.

## Key concepts
- **Views are canned queries.** `My Issues` is just "assigned to me, any team"; active/backlog are
  state-type filters. Note how similar these handlers look — the rule-of-three timer is running.
  Sprint 10 generalizes them into a **saved filter AST**, deleting the bespoke handlers.
- **Three states, always (`MyIssues.tsx`).** `null` = loading, `[]` = empty, populated = list. The
  empty state is the one everyone forgets; a blank screen reads as a bug.
- **Latency budget (`docs/latency-budget.md`, `lib/perf.ts`).** Numbers, not vibes: keyboard action
  < 100 ms, palette open < 50 ms, drag frame < 16 ms. Instrumented now so Sprint 12 has before/after
  evidence — you can't optimize what you never measured.
- **Demo seed (`packages/db/prisma/seed.ts`).** `pnpm db:seed` builds a workspace owned by the dev
  user, so "Sign in (dev)" lands on a populated board. A product isn't shippable until someone can
  *use* it in one command.
- **E2E strategy.** The keyboard-only journey (create → move → close, no mouse) is Tracer's signature
  test — if it breaks, Tracer stopped being Tracer. Scaffolded here; the suite consolidates and runs
  in CI as the app stabilizes.

## Exercise questions
1. `My Issues`, `Active`, and `Backlog` are three near-identical handlers. What's the abstraction
   they're begging for, and why is it right to wait until Sprint 10 to build it?
2. Which of loading / empty / error is missing somewhere in this codebase right now? (Go find one.)
3. The latency budget says palette-open < 50 ms. How would you *prove* you meet it? (Sprint 12's job.)
4. Why seed a demo dataset at all — what does "demoable in one command" change about how you build?

## Further reading
- The test pyramid & what deserves an E2E vs. integration vs. unit test
- Core Web Vitals · Performance budgets in CI
- Twelve-factor config (build-time vs. runtime env)
