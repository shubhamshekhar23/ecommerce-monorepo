# 24 — Theme System

The app already has a comprehensive CSS custom property system in `_variables.scss`. The missing layer is: switching between themes at runtime (dark mode, custom branding) without rebuilding CSS.

---

## Current State

- `_variables.scss` defines all design tokens as CSS custom properties on `:root`
- No dark mode values exist
- No runtime theme switching mechanism exists

---

## Items to Implement

### Dark Mode

- [x] **Define dark mode token values** — add a `[data-theme="dark"]` (or `@media (prefers-color-scheme: dark)`) block in `_variables.scss` that overrides the color tokens:
  ```scss
  [data-theme="dark"] {
    --color-bg-canvas: #0f1117;
    --color-bg-surface: #1a1d27;
    --color-bg-elevated: #22263a;
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-border: #2d3348;
    --color-accent: #3b82f6;
    // ... all color tokens overridden
  }
  ```
  Because the app already uses `var(--color-*)` everywhere, this is the only CSS change needed. No component changes required.
  - Complexity: Medium (defining the dark palette)
  - File: `src/styles/_variables.scss`

- [x] **`prefers-color-scheme` as default** — respect the OS-level preference before any user override:
  ```scss
  @media (prefers-color-scheme: dark) {
    :root {
      // same dark mode overrides
    }
  }
  ```
  This ensures dark mode works even without JavaScript (e.g. during SSR, before hydration).
  - Complexity: Easy
  - File: `src/styles/_variables.scss`
  - Connection: `15-accessibility.md` (prefers-color-scheme item)

- [x] **Theme toggle component** — a button that sets `data-theme="dark"` on `<html>` and persists the choice to `localStorage`:
  ```ts
  const toggleTheme = () => {
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };
  ```
  On app load: read from `localStorage`, fall back to `prefers-color-scheme`.
  - Complexity: Easy
  - File: `src/shared/theme/useTheme.ts`, `src/components/ThemeToggle/ThemeToggle.tsx`

- [x] **Avoid flash of wrong theme (FOUT)** — when the page loads, there's a moment before the React app hydrates where the theme can't be read from `localStorage`. Prevent the flash with an inline script in `<head>` that runs synchronously before paint:
  ```tsx
  // In layout.tsx <head>
  <script dangerouslySetInnerHTML={{ __html: `
    const t = localStorage.getItem('theme') || 
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
  `}} />
  ```
  This is one of the rare legitimate uses of `dangerouslySetInnerHTML` — it's controlled, synchronous, and contains no user input.
  - Complexity: Easy

### Theme Tokens Expansion

- [x] **Add missing token categories** — the current `_variables.scss` has color, typography, spacing, radius, shadow, and transition. Add:
  - `--z-index-modal`, `--z-index-tooltip`, `--z-index-header` — prevents z-index wars across components
  - `--elevation-1` through `--elevation-5` — semantic shadow levels
  - `--animation-bounce`, `--animation-fade-in` — named animation curves
  - Complexity: Easy

### Custom Branding (Future)

- [x] **Per-tenant theme support (document only)** — for future multi-tenant ecommerce (white-label), themes can be loaded per-tenant by setting CSS custom property values from a JSON theme config. Document the approach here for reference — implement when the product requires it.
  - Complexity: Complex (future, do not implement now)
