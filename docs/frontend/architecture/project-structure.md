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

- [x] **`public/` folder organization** — currently unstructured. Organize as:
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

---

## V4 Feature Folder Stubs

The V4 implementation adds eight new feature domains. Each must follow the same internal structure as existing features (`api/`, `hooks/`, `components/`, `interfaces/`, `utils/`, `constants/`, `mocks/`).

- [ ] **`features/account/`** — profile edit and `PATCH /users/me`; shared layout shell for the `/account/*` pages
  - Complexity: Easy (structure only; implementation in [ux/user-experience.md](../ux/user-experience.md))

- [ ] **`features/addresses/`** — saved shipping address CRUD
  - Complexity: Easy (structure only; implementation in [ux/user-experience.md](../ux/user-experience.md))

- [ ] **`features/reviews/`** — product review submit and listing
  - Complexity: Easy (structure only; implementation in [ux/user-experience.md](../ux/user-experience.md))

- [ ] **`features/stock-alerts/`** — back-in-stock subscribe/unsubscribe
  - Complexity: Easy (structure only; implementation in [ux/user-experience.md](../ux/user-experience.md))

- [ ] **`features/returns/`** — customer return request and admin returns management
  - Complexity: Easy (structure only; implementation in [ux/user-experience.md](../ux/user-experience.md))

- [ ] **`features/coupons/`** — coupon code validation and input component
  - Complexity: Easy (structure only; implementation in [security/payment-ux.md](../security/payment-ux.md))

- [ ] **`features/recommendations/`** — product recommendation strip from the analytics-service
  - Complexity: Easy (structure only; implementation in [architecture/feature-flags.md](./feature-flags.md))

- [ ] **`features/promotions/`** — admin promotion rule CRUD (consumer-facing promotions are applied server-side; this feature is admin-only)
  - Complexity: Easy (structure only; implementation in [ux/user-experience.md](../ux/user-experience.md))

### New Admin Pages

The following route segments need to be created under `app/[locale]/admin/`:

- `promotion-rules/` — list, `new/`, `[id]/edit/`
- `returns/` — list
- `queue/` — monitoring dashboard
- `feature-flags/` — runtime flag management
- `db-analytics/` — database health panel

### New Account Pages

The following route segments need to be created under `app/[locale]/account/`:

- `profile/` — name and email edit
- `addresses/` — saved address management
- `security/` — 2FA setup and disable
- `privacy/` — GDPR data deletion request
