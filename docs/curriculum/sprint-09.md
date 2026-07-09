# Curriculum Note — Sprint 09: Comments, Mentions & Presence

## Learning objectives
- Add a whole collaborative feature (**comments**) by reusing the sync spine — no new infrastructure.
- Route **ephemeral** state (presence) on a different path from **durable** state (comments/issues).

## Key concepts
- **Comments are synced entities (`routes/comments.ts`, `useIssueComments.ts`).** Creating a comment
  calls `recordMutation` exactly like editing an issue; the client filters deltas for
  `entity === "comment"`. Live updates, and even undo, come for free. When a feature lands with zero
  new sync code, your foundation was right.
- **Durable vs. ephemeral (ADR-0008).** Presence ("who's viewing") is heartbeated, expires, and is
  **never** written to the mutation log. Putting it in the log would add millions of worthless
  "still here" rows an hour and slow every bootstrap. It travels over the same socket but on a
  separate in-memory channel (`presenceBus`). Durability is a choice per state kind.
- **The routing question.** For any new collaborative state: *does it need to be correct across
  devices and survive a reload?* Yes → the log. No → an ephemeral channel. (Notice this isn't "is it
  collaborative?" — presence is very collaborative and still ephemeral.)

## Exercise questions
1. Post a comment in one browser window; watch it appear in another. How many lines of *sync* code
   did comments require? What does that tell you about Sprint 06?
2. Presence heartbeats every 5s per viewer. Estimate the log growth if presence were durable, for a
   50-person workspace over a workday. Why is that the wrong design?
3. A comment and a "typing…" indicator are both real-time. Which rides the log and which doesn't,
   and what's the single question that decides it?

## Deferred
- @mention parsing + a notification inbox, comment edit/delete, reactions, typing indicators (the
  ephemeral path is in place to carry them).

## Further reading
- Ephemeral vs. durable state · Presence/awareness protocols · Event-sourced domain features
