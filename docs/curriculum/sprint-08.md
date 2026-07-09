# Curriculum Note — Sprint 08: Undo/Redo & Optimistic UX

## Learning objectives
- Model every user action as a **command with an inverse**.
- Build an **undo/redo stack** with the right collaborative semantics.
- See why **undo through the sync pipeline** is nearly free once the S06/S07 foundation exists.

## Key concepts
- **Inverse mutations (`lib/undo.tsx`).** The undo of `set(state, B, was A)` is `set(state, A)` — an
  ordinary mutation. We don't snapshot-and-restore; we invert. Snapshots restore *state* (clobbering
  any concurrent edit that landed since); inverses restore *intent* (composing with concurrent
  edits). This distinction is the whole sprint.
- **Undo flows through the sync pipeline.** Because undo/redo just call the same mutation APIs, an
  undo emits a delta like any other change — it appears on every client, and (thanks to S07) would
  work offline and dedupe. Undo isn't a special system; it's a mutation you already know how to sync.
- **Per-user stacks / collaborative undo.** You can only undo YOUR OWN actions — the stack is
  per-client. Undoing a colleague's edit would be an act of aggression, so the model can't express
  it. A fresh action clears the redo branch (standard).
- **Delete → restore (`routes/issues.ts`).** The undo of a soft delete is a restore endpoint that
  clears `deletedAt` and emits an `update` delta, so clients that removed the issue add it back. The
  undo-toast tells the user Cmd/Ctrl+Z will bring it back.

## The acid test
Undo is the acid test of your mutation model: if undo is hard, the model is wrong. Here it's easy —
because mutations are already first-class, invertible, and synced, undo is "run the inverse".

## Exercise questions
1. You change an issue's state to Done. A colleague changes its title. You press Cmd+Z. With an
   *inverse* mutation, what happens to the title? What would a *snapshot* undo have done to it?
2. Why can't you undo a colleague's edit in this model? Where would you have to change the code to
   (wrongly) allow it?
3. Delete an issue, then press Cmd+Z. Trace the restore → delta → every client re-adds it. Which
   Sprint made this "just work"?

## Further reading
- The Command pattern & inverse operations · Collaborative undo (per-user vs global)
- Optimistic UI reconciliation
