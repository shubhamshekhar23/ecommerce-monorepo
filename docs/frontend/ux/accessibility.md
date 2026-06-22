# 15 — Accessibility (A11Y)

Accessibility is not optional for ecommerce — it has legal weight (WCAG 2.1 AA, ADA compliance) and directly affects users with disabilities. Treat it the same as security: a foundational requirement, not a nice-to-have.
All items target WCAG 2.1 Level AA.

---

## Core Principles

- **Perceivable** — content can be perceived by all users (visual, auditory, tactile)
- **Operable** — all functionality is accessible via keyboard, not just mouse
- **Understandable** — error messages, labels, and instructions are clear
- **Robust** — works with assistive technologies (screen readers, voice control)

---

## HTML & Semantics

- [x] **Semantic HTML audit** — replace `<div>` and `<span>` with the correct semantic element where applicable:
  - `<nav>` for navigation menus
  - `<main>` for the page's primary content (already in layout, verify it wraps correctly)
  - `<article>` for `ProductCard` (a self-contained piece of content)
  - `<section>` with `aria-labelledby` for grouped content blocks
  - `<header>`, `<footer>` — verify these are used as landmarks, not just class names
  - Complexity: Easy (audit + replace)
  - Files: all components

- [x] **Heading hierarchy** — every page must have exactly one `<h1>`. Headings must not skip levels (`h1` → `h3` without `h2`). Audit all pages.
  - Complexity: Easy (audit)

- [x] **Skip to content link** — add a visually hidden link as the very first element in `<body>` that becomes visible on focus and jumps to `<main>`. Allows keyboard users to skip the Header and Navbar on every page:
  ```tsx
  <a href="#main-content" className="skip-link">Skip to main content</a>
  <main id="main-content">...</main>
  ```
  - Complexity: Easy
  - File: `src/app/layout.tsx`, `src/styles/_utilities.scss` (`.skip-link` styles)

---

## ARIA

- [x] **ARIA labels on icon-only buttons** — buttons that contain only an icon (no visible text) must have `aria-label`. Examples: cart icon button in Navbar, close button in modals, image gallery prev/next arrows.
  ```tsx
  <button aria-label="Add to cart">🛒</button>
  ```
  - Complexity: Easy
  - Files: `Navbar.tsx`, `ProductImageGallery.tsx`, any icon-only button

- [x] **`aria-live` for dynamic content** — when cart count updates, toast notifications appear, or form errors are injected, screen readers need to be informed. Add `aria-live="polite"` to the cart count badge and toast container.
  - Complexity: Easy
  - Files: `Navbar.tsx` (cart badge), toast provider

- [x] **`aria-busy` during loading** — when a section is loading (skeleton visible), mark the container with `aria-busy="true"`. Screen readers will announce "loading" to the user.
  - Complexity: Easy
  - Files: all views with skeleton states

- [x] **`role` attributes where semantic HTML isn't enough** — examples:
  - `role="status"` on the "Added ✓" / "Failed" button feedback (politely announces to screen readers)
  - `role="alert"` on error messages (announces immediately)
  - `role="dialog"` on any modal overlay
  - Complexity: Easy

---

## Keyboard Navigation

- [x] **Full keyboard navigability** — every interactive element (buttons, links, form fields, dropdowns) must be reachable and operable via keyboard alone. Test by pressing Tab through every page.
  - Complexity: Medium (audit + fix)

- [x] **Focus trap in modals** — if any modal, drawer, or overlay is opened, focus must be trapped inside it. Tab should cycle through the modal's interactive elements, not elements behind it. Use Radix UI's Dialog/AlertDialog which handles this automatically, or implement manually.
  - Complexity: Medium
  - Library option: `@radix-ui/react-dialog` (already planned in CLAUDE.md)

- [x] **Visible focus ring on all interactive elements** — the `globals.scss` already has a `focus-visible` outline for links. Audit that buttons, inputs, and custom interactive components also show a visible focus indicator. Never use `outline: none` without providing an equivalent visual indicator.
  - Complexity: Easy (audit + CSS fix)

- [x] **Logical tab order** — the DOM order must match the visual order. If CSS repositions elements visually, check that Tab order still makes sense.
  - Complexity: Medium (audit)

---

## Forms & Errors

- [x] **All form inputs have explicit `<label>`** — use `htmlFor` + `id` pairing, not just placeholder text. Placeholder text disappears on input and has poor contrast. `FormField.tsx` already exists — verify it always renders a `<label>`.
  - Complexity: Easy (audit `FormField.tsx`)

- [x] **Accessible error messages** — error messages must be programmatically associated with their field using `aria-describedby`:
  ```tsx
  <input id="email" aria-describedby="email-error" aria-invalid={!!error} />
  <span id="email-error" role="alert">{error}</span>
  ```
  - Complexity: Easy–Medium
  - File: `src/components/FormField/FormField.tsx`

- [x] **Required field indication** — mark required fields with `aria-required="true"` and a visible indicator (asterisk with a legend explaining it, not just color).
  - Complexity: Easy

---

## Visual & Motion

- [x] **Color contrast** — all text must meet AA contrast ratios: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold). Audit using browser DevTools accessibility panel or the axe extension. The muted text colors (`--color-text-muted: #64748b`) on white are borderline — verify.
  - Complexity: Easy (audit, may need color value adjustments)

- [x] **`prefers-reduced-motion` support** — users who have set "Reduce Motion" in their OS should not see animations. Wrap all transitions and animations:
  ```scss
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
  Add this to `globals.scss` or `_utilities.scss`.
  - Complexity: Easy
  - File: `src/styles/globals.scss`

- [x] **`prefers-color-scheme` support** — `useTheme` reads OS preference via `matchMedia` as fallback when no localStorage override exists. Added a live `change` listener so theme updates in real time when the user changes their OS setting mid-session. Fixed: localStorage now only writes on explicit toggle, not on mount — ensures OS listener applies on return visits when user has never manually overridden.
  - Complexity: Easy (one media query in the theme system)
  - Depends on: `24-theme-system.md`

- [x] **Images have meaningful `alt` text** — `ProductCard` already passes `altText`. Audit all `<Image>` usages: decorative images get `alt=""`, informational images get a descriptive string. Never omit `alt` entirely.
  - Complexity: Easy (audit)

---

## Testing Tools

- [x] **`eslint-plugin-jsx-a11y`** — ESLint plugin that catches accessibility issues at author time (missing alt text, invalid ARIA, etc.). Install and add to `.eslintrc`:
  ```
  npm install --save-dev eslint-plugin-jsx-a11y
  ```
  - Complexity: Easy

- [x] **`axe-core` in test suite** — integrate `@axe-core/react` (dev-only) or `jest-axe` (for automated tests) to catch A11Y regressions in the test pipeline. See `16-testing.md` for the testing integration.
  - Complexity: Medium
  - Depends on: `16-testing.md`

- [x] **Manual screen reader testing** — code audit passed: all gallery thumbnail buttons have `aria-label`, sidebar toggles use `aria-expanded`, all text buttons have visible labels, `aria-live="polite"` regions present on all loading states. Full VoiceOver/NVDA walkthrough of the purchase journey should be run periodically.
  - Complexity: Medium (no code, just practice)
