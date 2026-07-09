# Curriculum Note — Sprint 03: Issues Core (the deliberate "classic" architecture)

## Learning objectives
- Build a REST resource **excellently**: consistent contract, cursor pagination, filters, partial
  updates, soft delete.
- Model a **team-scoped identifier** (`ENG-123`) and generate it race-free.
- Separate a workflow state's **type** (the stable API) from its **name** (a label).
- Feel the **invalidate-everything** mutation layer — the "classic" cost the sync engine (S06–07)
  will remove.

## Key concepts
- **Atomic identifier (`routes/issues.ts`).** The per-team issue number comes from an atomic
  `issueCounter: { increment: 1 }` on the Team row, whose returned value we use. A
  read-`MAX`-then-write would let two concurrent creates collide on the same number; the database
  serializes the single-row increment for us — gapless and race-free. (This is the same bug class
  as gapless invoice numbering; you should recognize it by now.)
- **Cursor pagination (ADR-0004, `lib/pagination.ts`).** Opaque cursor = last row's
  `createdAt|id`. Ordered `(createdAt desc, id desc)`; the keyset predicate mirrors that ordering.
  The `id` tie-breaker is mandatory — without it, rows sharing a `createdAt` get skipped.
- **State type vs name.** Queries filter on `type` (`STARTED`, `DONE`…) so they survive a team
  renaming "In Progress" to "Doing". The name is presentation; the type is the contract.
- **Soft delete.** `deletedAt` instead of `DELETE`. The row survives for history, and *every* read
  must filter `deletedAt: null`. That "every read" tax is the tradeoff — real, and worth it here.
- **Partial PATCH.** `undefined` fields are left untouched; `assigneeId: null` clears the field.
  `undefined ≠ null` in the DTO — a distinction that matters.
- **Announced flaw #1 (`web/src/Issues.tsx`).** After every mutation the client refetches the whole
  list (invalidate-everything). Correct but crude. This line is *why the course exists*: Sprint 06
  brings a mutation log and Sprint 07 an offline-first store that update targeted entities in
  real time. Open the network tab and count the refetches per edit.

## Exercise questions
1. Two people create an issue in the same team at the same instant. Walk through why the atomic
   increment gives them `ENG-4` and `ENG-5`, and what a `SELECT MAX(number)+1` would give them.
2. Remove the `id` tie-breaker from the cursor and ordering. Construct a case (two issues, same
   `createdAt`) where a row is silently skipped across a page boundary.
3. Why does the issue list filter on `state.type` in the query but the UI shows `state.name`? What
   breaks if a query hard-codes the name "In Progress"?
4. Count the network requests when you change one issue's priority in the UI. How many *should* it
   be? (Keep your answer — you'll compare against it in Sprint 07.)

## Further reading
- Keyset (cursor) pagination vs OFFSET · The "gapless sequence" problem
- Soft delete tradeoffs · Idempotency of PATCH (RFC 5789)
