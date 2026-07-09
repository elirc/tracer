# Curriculum Note — Sprint 10: Filter AST & Saved Views

## Learning objectives
- Turn a **feature into data**: filters as a serializable AST.
- **Dual-evaluate** the same AST on client (instant) and server (SQL), kept in sync by a test.
- Recognize the **rule-of-three** payoff: canned views become saved ASTs.

## Key concepts
- **Filters as data (`@tracer/shared/filter.ts`).** A filter is a typed predicate tree, not code. As
  data it's serializable (saved views), analyzable (which fields need indexes), and compilable to two
  targets. The field set is a **closed enum** validated by zod — that's the injection boundary; user
  input never becomes a raw column name.
- **Dual evaluation (ADR-0009).** `evaluate` runs the AST over the local store (instant, offline);
  `compileFilter` turns it into a Prisma where-clause for the server. Two implementations of one spec
  drift unless a test forces them together — that's the equivalence test's job.
- **Rule of three.** My Issues / Active / Backlog were near-identical canned handlers (S05). Now
  they're just saved ASTs, and the bespoke code can retire. Resisting the abstraction at two
  consumers and building it at the third is the skill.
- **Saved views are synced entities (`routes/saved-views.ts`).** Creating one rides `recordMutation`
  like everything else — it streams to every client.

## Exercise questions
1. Add a "created this week" filter. How many places change? (Hint: the enum, then both evaluators —
   and the equivalence test catches you if you only do one.)
2. Why is the field set an enum instead of a free-text field name? Construct the injection you'd have
   if the server compiled arbitrary field names into SQL.
3. The client filters the local store instantly; the server can also filter. When would you want the
   server to filter even though the client can? (Hint: 50,000 issues, only 100 loaded locally.)

## Deferred
- Cycles (time-boxed iterations + rollover), the filter-bar AST builder UI (presets are here),
  the client≡server equivalence property test over random ASTs, view sharing/permissions.

## Further reading
- Query ASTs & safe query building · Rule of three (refactoring) · Keeping dual implementations honest
