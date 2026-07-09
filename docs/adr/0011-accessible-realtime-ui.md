# ADR-0011: Accessibility patterns for a keyboard-first, real-time UI

- **Status:** Accepted
- **Date:** 2026-07-09
- **Sprint:** S14
- **Deciders:** Tracer authors

## Context
Tracer is keyboard-first (command palette, single-key shortcuts) and real-time (issues move under you
as teammates work). Both properties create accessibility hazards that a static CRUD app never faces:

1. **Discoverability.** A power-user shortcut nobody can find is a feature only its author uses. As we
   added bindings across S05–S13, the set outgrew the one-line "⌘K for commands" hint.
2. **Live updates are invisible to screen readers.** When a delta arrives and the DOM changes, a
   sighted user sees it; a screen-reader user hears nothing unless we announce it deliberately.
3. **Keyboard traps and focus.** Overlays (palette, help) must be escapable and must not strand focus.
4. **Theme.** A single hard-coded dark theme excludes users who need light or high contrast, and
   ignores the OS-level preference some users set precisely for accessibility reasons.

## Decision
Adopt four patterns, each backed by a web platform primitive rather than a library:

- **Shortcut help is generated from the registry.** The `?` overlay reads `useRegistry().list()` — the
  same registry that dispatches keys. Behavior and documentation share one source, so they cannot
  drift. Adding a shortcut anywhere makes it appear in help for free.
- **A single polite live region.** The toast container is `role="status" aria-live="polite"`. Toasts
  already fire on the events worth announcing (saves, errors, and — via `useToast` — live
  collaborative changes), so routing announcements through it reuses machinery we have instead of
  sprinkling `aria-live` across the tree.
- **Skip link + visible focus + reduced-motion.** A `.skip-link` (off-screen until focused) satisfies
  WCAG 2.4.1; `:focus-visible` outlines make the keyboard caret obvious; `prefers-reduced-motion`
  disables non-essential transitions.
- **Theming via CSS variables with a three-tier cascade.** `:root` (dark default) →
  `@media (prefers-color-scheme)` (follow the OS when unset) → `[data-theme]` (explicit choice wins).
  A theme swap is one attribute flip on `<html>`; no component knows its own colors.

## Alternatives considered
- **A hand-maintained shortcuts doc / cheatsheet.** Rots on the first forgotten update, and can't
  reflect scope (which shortcuts are active right now). The registry already knows; ask it.
- **`aria-live="assertive"` for live updates.** Interrupts whatever the user is reading on every
  teammate keystroke — hostile. Collaborative changes are "polite" by nature: informative, not urgent.
- **A component library / design system for a11y (e.g. Radix).** Correct for a bigger app; here it
  would dwarf the hand-rolled UI we've deliberately built to teach the primitives. The platform gives
  us live regions, `:focus-visible`, and `prefers-*` media queries for free.
- **JS-driven theming (inline styles per component).** Couples color to components and defeats the
  single-flip swap. CSS custom properties keep theme orthogonal to markup.

## Consequences
- The help overlay is now a forcing function: every new shortcut is self-documenting, so there's no
  excuse for an undiscoverable binding.
- Announcements are only as good as the events that reach the toast bus — a component that mutates the
  DOM silently still needs to `show()` something. That's a review checklist item, not a guarantee.
- **Deferred (named, not silently dropped):** automated axe-core checks in CI and internationalization
  (i18n) of copy. Both are real S15+/backlog items; this ADR covers structure and interaction, not
  translation or automated conformance scanning.

## Links
- `apps/web/src/ShortcutHelp.tsx`, `apps/web/src/lib/keyboard.tsx`, `apps/web/src/lib/toast.tsx`,
  `apps/web/src/App.tsx` (Shell skip link, ThemeToggle), `apps/web/src/index.css`,
  `docs/curriculum/sprint-14.md`
