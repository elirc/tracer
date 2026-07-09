# Sprint 09 — Collaboration: Comments, Mentions & Presence

**Branch:** `sprint-09/collaboration` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Human-to-human features on the sync spine: comments and reactions as synced entities, @mentions with a notification inbox, and *ephemeral* state — presence and typing indicators — which deliberately does NOT go through the mutation log. The sprint's thesis: durable vs ephemeral state take different paths.

## A — Issues
1. `Comments + reactions on issues (synced entities)`
2. `@mentions with autocomplete; subscriptions (author/assignee/mentioned auto-subscribe)`
3. `Notification inbox (unread counts, mark-read) over the sync engine`
4. `Presence: who's viewing this issue; typing indicators`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `feat(db+shared): Comment, Reaction, Subscription entities in the mutation log` | comments are entities like issues — create/edit/delete all sync, undo works on your own comments for free (S8 payoff) |
| 2 | `feat(web): comment thread UI — composer, edits, reactions` | |
| 3 | `feat(api+web): @mention autocomplete + Subscription fan-out on mutation apply` | subscription writes happen server-side in applyMutation — derived data, not client mutations |
| 4 | `feat(api): notifications derived from mutations (comment on subscribed issue, mention, assignment)` | consumer of the log — 🔗 Meridian S11's "events → projections," here the mutation log IS the event stream |
| 5 | `feat(web): inbox view — unread badge via store, mark-read as mutation` | |
| 6 | `feat(api): presence channel — ephemeral, redis-only, TTL keys, separate WS message type` | never touches Postgres or the log; **[flaw #5]** heartbeat every 2s per client, unbatched (harvest S12) |
| 7 | `feat(web): presence UI — avatars on issue detail + board cards; typing indicator in composer` | |
| 8 | `test(api): notification fan-out matrix (author/assignee/mention/watcher); no self-notify` | |
| 9 | `test(e2e): two-browser — mention lands in inbox live; presence avatars appear/expire` | |
| 10 | `docs: ADR-0008 durable vs ephemeral state paths; curriculum note` | |

## C — Review order
ADR-0008 → comments-as-entities (1) → derived subscriptions (3–4) → the presence channel (6) as the contrast.

## D — Teaching comments (~10)
- comments in the log — 📘 the test of a good spine: a whole feature (threads, edits, offline comments, undo) lands with zero new infrastructure
- derived data server-side — 📘 subscriptions/notifications are *consequences*, not intents — they don't come from clients; where derivation lives in applyMutation
- no self-notify — 🔍 review-lens: the notification matrix test reads like a spec; tables beat prose for fan-out rules
- ephemeral path — 📘 presence in the log would be absurd (thousands of rows/hour of "still here"); TTL keys + a separate message type; durability is a *choice per state kind*
- typing indicator debounce — ⚠️ naive keyup events = a message per keystroke; leading-edge debounce + auto-expire
- presence heartbeat — *(no comment — flaw #5 stays silent)*
- offline comments — 🔗 composer works offline via S7 queue; mention autocomplete degrades to workspace-member cache — degradation paths are design work

## E — Debate
**"Should notifications be a synced entity or a REST resource?"** REST: they're per-user, no collaboration. Synced: unread badge must be instant across tabs/devices, mark-read offline should work — that's exactly the sync engine's job. **Resolution:** synced entity, per-user partition of the log. Lesson: *"does it need to be correct across devices while offline?" is the routing question, not "is it collaborative?"*

## F/G — Close
- Squash: `feat(sprint-09): comments, mentions, presence (closes #…)`
- **Lab:** `lab/sprint-09` — three bugs: a self-notification leak, a presence key without TTL (ghost avatars), a mention fan-out that notifies non-team guests (authz!).
- Ledger: flaw #5 recorded.
- Recap idea: *route state by its durability requirements — the log for intent, Redis for "I'm here."*
