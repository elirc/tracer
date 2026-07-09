# Sprint 14 — Accessibility & Keyboard-First Polish

**Branch:** `sprint-14/a11y-polish` · **Size:** M/L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Keyboard-first is only a virtue if it's accessible: audited a11y (axe in CI), an accessible drag-and-drop alternative, palette and shortcut a11y, focus discipline everywhere, plus theming and formatting i18n-lite. Meridian S14 taught the fundamentals; this sprint applies them to the *hard* cases a real-time keyboard app creates.

## A — Issues
1. `axe-core CI gate; audit-first failing-allowlist pass (Meridian pattern)`
2. `Accessible board: keyboard DnD announced via live regions; screen-reader story for live updates`
3. `Palette + shortcut a11y: combobox semantics, discoverability, remapping`
4. `Theming (dark/light/system) + reduced motion; Intl formatting for dates/numbers`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `test(a11y): axe in playwright, failing allowlist committed (fast-forward pattern)` | |
| 2 | `fix(a11y): semantics + focus discipline — landmarks, dialog traps, detail-panel focus return` | |
| 3 | `feat(a11y): accessible board DnD — S4's keyboard mode gets ARIA grab/drop announcements` | live region narrates: "ENG-123 lifted… over In Progress, position 2 of 5… dropped"; 🔗 S4 built the mechanics, this makes them perceivable |
| 4 | `feat(a11y): live-update announcements — polite region for foreign changes to the focused issue` | the real-time a11y problem: your screen changes when *someone else* types; rate-limited, focused-entity-only |
| 5 | `fix(a11y): palette as combobox — aria-activedescendant, result counts announced` | |
| 6 | `feat(web): shortcut discoverability — ? overlay from the registry + per-user remapping (synced entity)` | remaps sync across devices; conflicts validated against the registry |
| 7 | `feat(web): theming — token-based dark/light/system + prefers-reduced-motion (drag animations)` | |
| 8 | `refactor(web): Intl.* for all dates/numbers (relative timestamps, cycle ranges)` | fast-forward from Meridian; full string i18n deliberately deferred — ADR-0011 records why (single-locale product for now, strings still centralized) |
| 9 | `test(e2e): keyboard-only journey extended — board move via accessible DnD, palette, remapped key` | |
| 10 | `test(a11y): allowlist empty — axe required` | |
| 11 | `docs: ADR-0011 i18n scope; a11y patterns doc (live regions for real-time apps); curriculum note` | |

## C — Review order
The two hard problems first: accessible DnD (3) and live-update announcements (4) — then the standard sweep.

## D — Teaching comments (~9)
- accessible DnD — 📘 DnD is the canonical a11y hard case; the pattern: every pointer interaction has a keyboard twin *and* a narration; S4's keyboard mode meant we retrofit narration, not mechanics — sequencing that saved this sprint
- live-region for foreign edits — 📘 nobody teaches real-time a11y: announce changes to the *focused* entity only, politely, rate-limited — a firehose narration is worse than silence
- focus return — ⚠️ closing a detail panel must restore focus to the triggering row — in a virtualized list that row may be unmounted; the focus-anchor pattern
- combobox semantics — 🔍 review-lens: a palette is a combobox in ARIA's eyes; activedescendant vs roving focus and why activedescendant here
- remapping as synced entity — 🔗 the spine's final dividend count: user preferences sync offline-safe with zero new infrastructure
- deferred string i18n — 📘 scope honesty: an ADR that says "not now, here's the debt shape and trigger" beats silent omission

## E — Debate
**"Announce collaborative changes to screen readers at all?"** Silence: predictable, but the user acts on stale state. Announce all: unusable firehose. **Resolution:** announce only foreign changes to the entity holding focus, debounced, with a global toggle. Lesson: *accessibility in collaborative apps is an information-design problem, not a compliance checkbox.*

## F/G — Close
- Squash: `feat(sprint-14): accessibility, keyboard polish, theming (closes #…)`
- Deferred: full string externalization + locales; high-contrast theme; RTL.
- Recap idea: *keyboard-first and accessible are the same discipline — one registry, one focus model, narration for everything the eye gets for free.*
