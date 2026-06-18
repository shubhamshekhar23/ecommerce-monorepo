# 01 — Project Structure & Architecture

Gaps in the current feature folder layout and missing tooling config files.
Source: `feature-module-breakdown.md`, `assets-folder.md`, `config-files.md`

---

## Feature Folder Completeness

Each feature (`cart`, `orders`, `products`, `auth`, `checkout`, `admin`) should have a consistent internal structure:

```
features/<name>/
  components/
  hooks/
  api/
  interfaces/
  utils/       ← missing in most features
  constants/   ← missing everywhere
  mocks/       ← missing everywhere
```

- [x] **`constants/` per feature** — magic strings, limits, and config values scoped to a feature. Examples: `CART_MAX_QUANTITY`, `PRODUCTS_PAGE_SIZE`, `ORDER_STATUS_LABELS`. Prevents magic numbers scattered in hooks and components.
  - Complexity: Easy
  - Affects: all 6 features

- [x] **`mocks/` per feature** — static mock data matching the feature's interfaces. Used in tests, Storybook, and dev when the API is down. Example: `features/products/mocks/products.mock.ts` exporting a `mockProduct` and `mockProductList`.
  - Complexity: Easy
  - Affects: all 6 features

- [x] **`utils/` in missing features** — `auth` already has `utils/`. Add `utils/` to `cart`, `orders`, `products`, `checkout`, `admin` for pure functions (formatters, calculators, transformers) that don't belong in hooks.
  - Complexity: Easy
  - Affects: cart, orders, products, checkout, admin

---

## Shared Infrastructure

- [x] **`src/hooks/` for cross-feature reusable hooks** — hooks that no single feature owns belong here. Start with:
  - `useDebounce.ts` — debounce any value by N ms (used in search input)
  - `useIntersectionObserver.ts` — observe when an element enters the viewport (used for lazy load on visibility and scroll restoration)
  - `useLocalStorage.ts` — typed get/set wrapper around localStorage
  - `useScrollRestoration.ts` — saves and restores window scroll position across navigations
  - Complexity: Easy–Medium

- [ ] **`public/` folder organization** — currently unstructured. Organize as:
  - `public/images/` — static images (logo, OG image, fallback product image)
  - `public/icons/` — favicon variants, PWA icons
  - `public/fonts/` — self-hosted font files (if moved off Google Fonts CDN)
  - Complexity: Easy (just moving files, updating references)

---

## Tooling & Config Files

- [x] **`.stylelintrc.json`** — SCSS linter. Catches things ESLint misses: unknown CSS properties, selector specificity issues, nesting depth violations. Install `stylelint` + `stylelint-config-standard-scss`.
  - Complexity: Easy

- [x] **Husky + lint-staged** — pre-commit hooks that run ESLint, type-check, and Stylelint only on staged files. Prevents broken code from ever reaching the repo.
  - Install: `husky`, `lint-staged`
  - Config: `.husky/pre-commit` runs `lint-staged`; `.lintstagedrc.js` maps file patterns to commands
  - Complexity: Easy

- [x] **`.editorconfig`** — ensures consistent indentation (2 spaces), line endings (LF), and charset (utf-8) across editors and contributors. Respected by VS Code, JetBrains, etc. without plugins.
  - Complexity: Easy (one file, ~10 lines)
