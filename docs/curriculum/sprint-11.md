# Curriculum Note — Sprint 11: Search & Command Palette v2

## Learning objectives
- Write a **fuzzy matcher** from first principles (subsequence scoring, bonuses).
- Build **hybrid search**: instant-local + thorough-remote, merged behind one input.
- Rank with **frecency** (frequency × recency).

## Key concepts
- **Fuzzy from scratch (`@tracer/shared/fuzzy.ts`).** Characters must match in order (subsequence);
  bonuses for consecutive runs, word boundaries, and camelCase humps; a mild length penalty. ~80
  lines you own — no library, no bundle cost, and tunable to identifier patterns (ADR-0010).
- **Hybrid search (`CommandPalette.tsx`, ADR-0010).** Commands rank instantly and locally (the
  matcher over a small in-memory list); issues come from a **debounced** server search over the
  long tail. Two systems, one input, no visible seam. Never block the instant path on the slow one.
- **Frecency.** Your most-used commands float up: `score + frequency*weight`, persisted client-side
  (it's *your* muscle memory, not shared state). Recency decay is the natural extension.
- **Search is a permission bypass waiting to happen (`routes/search.ts`).** The server search is
  scoped to the teams the user may see. A search index that forgets scoping is a data-exfiltration
  API — the same lesson as the S02 guest scoping, at the search layer.

## Exercise questions
1. `fuzzyMatch("gh", "GitHub sync")` scores higher than `fuzzyMatch("gh", "laughing")`. Which bonuses
   cause that, and why is it the behavior you want?
2. Why is the server search debounced but the command ranking isn't? What's different about the two
   paths' cost?
3. A guest on one team searches. Trace where their results are scoped. What would leak if that step
   were missing?
4. When would you replace the hand-rolled matcher with a library? (ADR-0010 names the trigger.)

## Deferred
- Postgres FTS with `tsvector` + GIN (the current server search is a `contains`), navigation to an
  issue from a palette result, recency *decay* in frecency, highlighting matched characters.

## Further reading
- Subsequence / fuzzy matching · Frecency algorithms · Debouncing remote search · FTS with tsvector
