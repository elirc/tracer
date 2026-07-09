# Curriculum Note — Sprint 04: Board, Ordering & Keyboard v1

## Learning objectives
- Represent an **ordered collection** so a reorder is a single-row update (fractional indexing).
- Model a drag as **one mutation** (state change + reposition together).
- Build a **keyboard-first** layer: a global shortcut registry + a command palette.

## Key concepts
- **Fractional indexing (`@tracer/shared/order.ts`, ADR-0005).** `keyBetween(a, b)` returns a base-62
  string strictly between two keys. Moving an issue writes one row. The alphabet is in ascending
  ASCII order so plain string comparison sorts correctly. **Flaw #2:** keys grow without bound under
  repeated same-slot inserts — rebalancing is Sprint 12. The property tests assert the ordering
  invariant across random insertion sequences (exactly the offline-merge case S07 depends on).
- **Move = one intent = one mutation (`routes/issues.ts`).** The move endpoint takes
  `{ stateId, afterId? }` and the *server* computes the between-key. Two calls (change state, then
  reorder) could tear under failure; one call can't. The server owning the key also means two clients
  can't invent colliding orders — yet (S07 moves this to the client for offline reorders).
- **Keyboard registry (`web/lib/keyboard.tsx`).** Shortcuts register/unregister with component
  lifetime, so the active set mirrors the screen. The one rule already enforced: plain keys don't
  fire while typing in an input, but `mod`-combos (Cmd+K) do. Scoped stacks come later.
- **Command palette v1 (`web/CommandPalette.tsx`).** Cmd+K, substring filter. Every action should be
  reachable here — it's the keyboard-first spine. Real frecency ranking is Sprint 11.

## Exercise questions
1. Move an issue to the top of a 100-issue column. How many rows does the fractional-index approach
   write? How many would integer resequencing write?
2. Insert 60 issues one-at-a-time into the *same* slot (always between the same two). Watch the
   `sortOrder` strings grow. Why does this happen, and what will Sprint 12 do about it?
3. The move endpoint does state-change and reorder in one request. Construct the bug you'd get if it
   were two separate requests and the second failed.
4. Why does the keyboard registry let Cmd+K fire while typing in a text box, but not a bare `c`?

## Further reading
- Fractional indexing (the "keys between keys" technique) · CRDT-friendly ordering
- Command palettes & keyboard-first UX · Property-based testing with fast-check
