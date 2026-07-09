# ADR-0009: Filters as an AST, evaluated on both client and server

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S10
- **Deciders:** Tracer authors

## Context
Views (My Issues, Active, Backlog) started as hard-coded server queries (S05). By S10 there are
enough of them, and users want their own — that's the rule-of-three signal to turn views into data.
A filter needs to run in two places: instantly on the client's local store, and on the server for
large teams / bootstrap.

## Decision
Filters are a **typed predicate AST** (`@tracer/shared/filter.ts`). It compiles to two targets:
- a **pure client evaluator** (`evaluate`) that runs over local issues with no round-trip;
- a **server compiler** (`compileFilter` → Prisma where) for server-side filtering.

The field set is a **closed enum**, validated by zod — user input can never become a raw column
name. Saved views store the AST as data.

## Alternatives considered
- **Server-only filtering.** One engine, one truth — but every filter change is a network round-trip,
  and it doesn't work offline. The product's feel *is* instant filtering over the local store.
- **Filter query strings / raw SQL fragments.** Flexible, but an injection factory and impossible to
  run client-side. An AST is serializable (saved views), analyzable (which fields need indexes), and
  safe by construction.

## Consequences
- Two implementations of one spec will drift unless a test forces them together: an **equivalence
  test** (client `evaluate` ≡ server `compileFilter` on the same fixtures) keeps them honest.
- Canned views (S05) become saved ASTs — the rule-of-three payoff; the bespoke handlers can retire.
- Adding a filterable field means extending the enum in one place, then both evaluators.

## Links
- `packages/shared/src/filter.ts` (+ tests), `apps/api/src/lib/filter-compile.ts`,
  `apps/api/src/routes/saved-views.ts`, `docs/sprints/sprint-10.md`
