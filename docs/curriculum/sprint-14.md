# Curriculum Note — Sprint 14: Accessibility & keyboard-first polish

## Learning objectives
- Make a keyboard-first, real-time UI **accessible** using web platform primitives, not a library.
- Learn the load-bearing idea: **a single source of truth for behavior and its documentation**.
- Understand **live regions** — how a screen reader hears a change that a sighted user just sees.

## Key concepts
- **Generated documentation beats maintained documentation.** The `?` help overlay reads the SAME
  keyboard registry that dispatches keys (`useRegistry().list()`), so the docs cannot drift from the
  behavior. Any hand-written shortcut list is wrong the moment someone adds a binding and forgets the
  docs. Whenever behavior and its description can share a source, make them — this is the deeper
  version of "don't repeat yourself."
- **Live regions make real-time accessible.** A screen reader announces DOM changes only inside an
  `aria-live` region. We made the toast container `role="status" aria-live="polite"` and route
  announcements through the toast bus we already had — reuse over sprinkling `aria-live` everywhere.
  **Polite, not assertive:** collaborative updates are informative, not urgent; `assertive` would
  interrupt the user on every teammate's keystroke.
- **The keyboard is a first-class user.** Skip link (WCAG 2.4.1, off-screen until focused — hidden
  from the mouse, not from Tab), visible `:focus-visible` outlines, and escapable overlays. Going
  mouse-free for power is worthless if a keyboard user can't see where focus is.
- **Theme as data, not code.** Colors live in CSS custom properties; a theme swap is one `data-theme`
  attribute on `<html>`. The cascade is deliberate: dark default → follow the OS preference when the
  user hasn't chosen → explicit choice always wins. Respecting `prefers-color-scheme` and
  `prefers-reduced-motion` is an accessibility default, not a nicety — some users set those because
  they must.

## Why this is its own sprint
Accessibility retrofitted at the end is expensive and partial; accessibility as a dedicated pass, once
the interaction surface has settled (S05–S13), is cheap and thorough. The prerequisite was the
keyboard **registry** (S05): because shortcuts were data from the start, the help overlay was a
half-day feature instead of an archaeology project. Good S5 architecture paid its dividend in S14.

## Exercise questions
1. If you add a new shortcut in some component next week, what do you have to change for it to appear
   in the `?` overlay? Why is the answer "nothing"?
2. Why `aria-live="polite"` and not `"assertive"` for live collaborative updates? Give a concrete
   scenario where `assertive` would make the app hostile to a screen-reader user.
3. The skip link is `position: absolute; top: -48px`, not `display: none`. Why does that distinction
   matter for a keyboard user?
4. The theme cascade has three tiers. Walk through what a photophobic user who set their OS to light
   mode sees (a) before and (b) after they click the dark toggle — and why the explicit choice must
   win over the OS preference.

## Deferred (named, not dropped)
- Automated **axe-core** conformance checks wired into CI; **internationalization** (i18n) of copy;
  full focus-trap management inside overlays (currently Escape + click-away, which suffices for the
  two overlays we have). All are real backlog items — see ADR-0011.

## Further reading
- WAI-ARIA live regions · WCAG 2.4.1 Bypass Blocks · `:focus-visible` · `prefers-reduced-motion`
- "Single source of truth" as applied to docs/behavior · Progressive enhancement
