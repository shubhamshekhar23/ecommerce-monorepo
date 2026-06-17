# 02 — Styling

Fill gaps in the global SCSS infrastructure. These files should only contain design tokens, mixins, and utilities — never business styles.
Source: `styles-folder.md`

---

## Current State

`src/styles/` has:
- `_variables.scss` — comprehensive CSS custom properties ✓
- `_mixins.scss` — file exists but is effectively empty
- `globals.scss` — CSS reset, typography rules, and utility classes all mixed together

---

## Items to Implement

- [ ] **Expand `_mixins.scss`** — add reusable SCSS mixins that components can `@use`. Start with:
  - `flex-center` — `display: flex; justify-content: center; align-items: center`
  - `responsive-grid($min-col-width)` — CSS Grid auto-fill shorthand
  - `truncate` — single-line text truncation with ellipsis
  - `visually-hidden` — hides element visually but keeps it accessible (for screen readers)
  - `breakpoint($size)` — wraps a media query using the breakpoint variables
  - Complexity: Easy

- [ ] **`_breakpoints.scss`** — CLAUDE.md references `_breakpoints.scss` but it doesn't exist. Move breakpoint values out of `_variables.scss` into dedicated breakpoint mixins so components can do `@include breakpoint(md) { ... }` instead of hardcoding pixel values per module.
  - Complexity: Easy

- [ ] **`_utilities.scss`** — extract the two utility classes currently in `globals.scss` (`.container`, `.hide-scrollbar`) into a dedicated utilities file. Add:
  - `.visually-hidden`
  - `.text-truncate`
  - `.sr-only` (alias for visually-hidden)
  - Complexity: Easy

- [ ] **`_typography.scss`** — move all heading (`h1`–`h6`), `p`, `a`, and `button` base styles out of `globals.scss` into a dedicated typography partial. `globals.scss` should only import partials, not define styles directly.
  - Complexity: Easy

- [ ] **`_reset.scss`** — extract the box-sizing / margin / padding reset block from `globals.scss` into a dedicated reset file. Makes it easy to swap reset strategies later (e.g. replace with `modern-normalize`).
  - Complexity: Easy

- [ ] **Refactor `globals.scss` to import-only** — after the above extractions, `globals.scss` (or a `main.scss`) should only contain `@use` and `@forward` statements, no style definitions. Mirrors the `main.scss` pattern from the notes.
  - Complexity: Easy (depends on the 4 items above being done first)
