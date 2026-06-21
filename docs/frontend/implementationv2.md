# Frontend Implementation Sequence V2

All 10 phases of V1 are complete. This document sequences the remaining unimplemented sub-items from the topic docs — enhancements and depth items that were deferred during the first pass.

Each item links back to the topic doc where the full implementation detail lives.

---

## Phase 1 — API & Network Hardening

These items make the API layer production-grade. Everything downstream (testing, error UI, performance) is easier once the API boundary is solid.

- [x] **Zod validation of API responses at runtime** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Add Zod schemas for every API endpoint response; parse inside each `api/*.ts` function so type mismatches surface at the boundary, not silently in the UI

- [x] **Typed request/response contracts per endpoint** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Audit all `api/*.ts` functions — no `any` in return types; return type must be the Zod-validated shape

- [x] **Centralized API error normalization** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - `apiClient.ts` response interceptor converts all HTTP errors to typed `AppError` instances before they reach hooks; hooks never inspect raw status codes

- [x] **Automatic retry with exponential backoff** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Retry `network` and `server` (5xx) errors automatically; never retry `auth` (401/403) or `validation` (400/422) errors; use TanStack Query `retry` + custom `retryDelay`

- [x] **Request timeout via `AbortController`** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Every `fetch` call in `api/*.ts` wraps in a 10-second `AbortController` timeout; fail fast rather than hanging indefinitely

- [x] **Duplicate submit prevention audit** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Audit every form's submit button — must be `disabled` while `isPending === true`; applies to cancel order, category edit, product edit, user actions

- [x] **Debounce expensive UI interactions** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Search, filter, and sort inputs must go through `useDebounce` before firing a query; default debounce 300ms

---

## Phase 2 — Security Completions

Loose ends from the security phase that require backend coordination or manual verification.

- [x] **Optimistic auth state on page load** → [security/authentication.md](./security/authentication.md)
  - Prevent unauthenticated flash on protected pages by reading auth state from the cookie synchronously in middleware before the client-side Zustand store hydrates; middleware already has the `auth_session` cookie check — extend it to set a header that Server Components can read

- [x] **`SameSite=Strict; Secure` on auth cookies** → [security/security-headers.md](./security/security-headers.md)
  - Verify the backend sets `SameSite=Strict; Secure; HttpOnly` on all auth cookies (refresh token, session); check `Set-Cookie` headers in browser DevTools on login; this is a backend fix surfaced here for completeness

---

## Phase 3 — Error Handling Polish

Improves how errors are communicated to users after the `AppError` type is in place (Phase 1).

- [x] **Per-category error display rules** → [observability/error-handling.md](./observability/error-handling.md)
  - In mutation `onError` callbacks, branch on `AppError.category`: `validation` → field-level message, `auth` → redirect to login, `network` → offline toast, `server` → generic "try again", `business` → specific message from `AppError.message`

- [x] **Retry UI for network errors** → [observability/error-handling.md](./observability/error-handling.md)
  - For `network`-category errors, the toast should include a "Try Again" button that re-fires the mutation; TanStack Query handles automatic retries; this button is for user-initiated retry after auto-retries exhaust

---

## Phase 4 — SEO Enhancements

Additive SEO improvements that don't touch routing.

- [x] **OpenGraph image per product page** → [seo/seo.md](./seo/seo.md)
  - Add `app/[locale]/products/[slug]/opengraph-image.tsx` using `@vercel/og`; render product image + name + price overlay; controls the preview card when a product URL is shared on social media

- [x] **Crawlable category filter URLs** → [seo/seo.md](./seo/seo.md)
  - Audit `/products?category=1` — category should use slug, not numeric ID (`/products?category=electronics`); check what the backend `/products` endpoint accepts and align the frontend `useUrlState` params

---

## Phase 5 — Accessibility

WCAG AA compliance. These are code changes (ARIA attributes, semantic HTML) not just audits.

- [x] **Semantic HTML audit** → [ux/accessibility.md](./ux/accessibility.md)
  - Replace non-semantic `<div>`/`<span>` with `<article>`, `<section>`, `<nav>`, `<aside>`, `<time>`, `<address>` where appropriate; priority: `ProductCard`, `OrderDetailView`, `Navbar`

- [x] **Heading hierarchy audit** → [ux/accessibility.md](./ux/accessibility.md)
  - Every page must have exactly one `<h1>`; no skipped levels; audit all 10+ pages including admin views

- [x] **ARIA labels on icon-only buttons** → [ux/accessibility.md](./ux/accessibility.md)
  - Add `aria-label` to: cart icon button in Navbar, close button in modals/drawers, image gallery prev/next arrows, ThemeToggle (already has it — verify others)

- [x] **`aria-busy` on loading skeletons** → [ux/accessibility.md](./ux/accessibility.md)
  - When a section shows a skeleton, mark the container with `aria-busy="true"` so screen readers announce the loading state

- [x] **`role` attributes where semantic HTML is insufficient** → [ux/accessibility.md](./ux/accessibility.md)
  - `role="status"` on toast notifications, `role="alert"` on error messages, `role="progressbar"` on the top loader

- [x] **Focus trap in modals and drawers** → [ux/accessibility.md](./ux/accessibility.md)
  - Tab key must cycle within an open modal and not reach elements behind it; use Radix UI `Dialog`/`AlertDialog` (handles this natively) or implement `focus-trap` manually

- [x] **Full keyboard navigability audit** → [ux/accessibility.md](./ux/accessibility.md)
  - Tab through every page manually; every button, link, and form field must be reachable and operable without a mouse; fix any focus-order issues

- [x] **Logical tab order** → [ux/accessibility.md](./ux/accessibility.md)
  - DOM order must match visual order; audit any components where CSS `order`, `position: absolute`, or flex reordering diverges from the source order

- [x] **Accessible form error messages** → [ux/accessibility.md](./ux/accessibility.md)
  - Error messages must be linked to their field via `aria-describedby`; verify `FormField.tsx` already does this and audit any form that doesn't use `FormField`

- [x] **Required field indication** → [ux/accessibility.md](./ux/accessibility.md)
  - Mark required fields with `aria-required="true"` and a visible asterisk (`*`) with a legend; never rely on color alone

- [x] **Color contrast audit** → [ux/accessibility.md](./ux/accessibility.md)
  - All text must meet WCAG AA: 4.5:1 for body text, 3:1 for large text; audit `--color-text-muted: #64748b` on white backgrounds — this is borderline; use browser DevTools accessibility panel

- [x] **Alt text audit** → [ux/accessibility.md](./ux/accessibility.md)
  - All `<Image>` usages: decorative images get `alt=""`, informational images get a descriptive string; audit `ProductCard`, `ProductImageGallery`, admin views

- [x] **`axe-core` in component test suite** → [ux/accessibility.md](./ux/accessibility.md)
  - Add `jest-axe` to every RTL component test; `await expect(container).toHaveNoViolations()` after each render; catches ~30% of A11Y issues automatically

---

## Phase 6 — Testing

Unit, integration, and E2E coverage. Build in dependency order: utilities first, then hooks, then components, then E2E.

- [x] **Unit tests for pure utility functions** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Every function in `features/*/utils/` and `src/shared/` (including new `formatters.ts`) gets unit tests; these have no side effects and are the easiest to cover

- [x] **Unit tests for custom hooks** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Use `renderHook` from `@testing-library/react` with MSW handlers; cover `useCart`, `useAddToCart`, `useOrder`, `useOrderStatusStream` (mock EventSource), `useTheme`, `useCookieConsent`

- [x] **Component test: `CartView`** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Render with items: assert item names, quantities, subtotals, total; render empty: assert empty state; assert "Clear cart" confirmation dialog; assert remove item

- [ ] **Component test: add-to-cart flow** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Render `ProductCard` + Navbar cart count together with MSW; click "Add to Cart"; assert cart count increments

- [ ] **Component test: product filter** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Render `CategorySidebar` + `ProductGrid` with MSW handlers; select a category; assert only products in that category are displayed

- [ ] **E2E: Browse and add to cart** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Playwright: land on `/en`, navigate to `/en/products`, click a product, click "Add to Cart", assert cart count updates in Navbar

- [ ] **E2E: Full checkout flow** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Playwright: login → add item to cart → proceed to checkout → fill Stripe test card → submit → assert order confirmation and order appears in `/en/orders`

- [ ] **E2E: Admin product CRUD** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Login as admin → create product → verify in listing → edit → delete; assert product disappears from listing

- [ ] **Playwright screenshot tests** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Capture baseline screenshots for `ProductCard`, `Navbar`, checkout form; fail CI on unexpected visual change

- [ ] **Pact contract tests — extend to all feature APIs** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - A Pact consumer test exists at `src/__tests__/pacts/products.pact.spec.ts`; extend to cover `orders`, `cart`, `auth`, `categories` APIs; publish pacts to a Pact Broker so backend can verify

---

## Phase 7 — CI/CD Quality Gates

CI enforcement. Depends on Phase 6 (tests must exist before you gate on them).

- [ ] **Stylelint in CI** → [testing/ci-cd-quality-gates.md](./testing/ci-cd-quality-gates.md)
  - Add `npx stylelint "src/**/*.scss"` step to the GitHub Actions workflow; already runs via lint-staged on commit — make it a required CI check too

- [ ] **Prettier format check in CI** → [testing/ci-cd-quality-gates.md](./testing/ci-cd-quality-gates.md)
  - Add `prettier --check "src/**/*.{ts,tsx,scss}"` to CI; fail the build if any file isn't formatted

- [ ] **E2E tests in CI** → [testing/ci-cd-quality-gates.md](./testing/ci-cd-quality-gates.md)
  - Run Playwright tests in CI against a real `next build && next start`; use `@playwright/test` `webServer` config; requires a test environment with a seeded database

- [ ] **Accessibility audit in CI** → [testing/ci-cd-quality-gates.md](./testing/ci-cd-quality-gates.md)
  - Run `axe` via Playwright against `/en`, `/en/products`, `/en/products/[slug]`, `/en/cart`; fail if any critical or serious violations are found

- [ ] **Bundle size gate in CI** → [testing/ci-cd-quality-gates.md](./testing/ci-cd-quality-gates.md)
  - Set per-page JS budget (e.g. 200kB for homepage, 300kB for product page); fail CI if any page exceeds it; use `bundlewatch` or Next.js build output analysis

- [ ] **Dependabot** → [testing/ci-cd-quality-gates.md](./testing/ci-cd-quality-gates.md)
  - Add `.github/dependabot.yml` for `npm` in `apps/frontend`, `apps/backend`, `packages/shared-types`; weekly dependency PRs with security patches auto-merged

- [ ] **Lighthouse CI** → [testing/ci-cd-quality-gates.md](./testing/ci-cd-quality-gates.md)
  - Run `@lhci/cli` in CI; enforce: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90; treat Web Vitals failures (LCP > 2.5s, CLS > 0.1) as hard failures

---

## Phase 8 — Performance Deep Dive

Performance is measured first, then fixed. Run the bundle analyzer before making changes.

- [ ] **Bundle analysis — identify largest dependencies** → [performance/bundle-optimization.md](./performance/bundle-optimization.md)
  - Run `ANALYZE=true npm run build`; look for: lodash (use lodash-es or cherry-pick), moment (replace with date-fns already installed), any duplicated packages loaded twice

- [ ] **Route-level code splitting audit** → [performance/bundle-optimization.md](./performance/bundle-optimization.md)
  - Verify no route's `page.tsx` imports the entire app's logic; audit barrel files (`features/*/index.ts`) — re-exporting everything defeats tree shaking

- [ ] **Tree shaking verification** → [performance/bundle-optimization.md](./performance/bundle-optimization.md)
  - Ensure all packages use ES modules; any CommonJS `require()` in `node_modules` blocks tree shaking for that package; check the bundle analyzer for unexpectedly large chunks

- [ ] **Font preloading** → [performance/loading-and-network.md](./performance/loading-and-network.md)
  - Add `<link rel="preload" as="font">` for WOFF2 font files in `[locale]/layout.tsx`; or migrate to `next/font` (handles preloading automatically and eliminates FOUT)

- [ ] **`font-display: swap` audit** → [performance/loading-and-network.md](./performance/loading-and-network.md)
  - If using `@font-face` directly in SCSS, verify `font-display: swap` is set; if using `next/font`, this is handled automatically — audit which approach is in use

- [ ] **Intersection Observer lazy load for below-fold components** → [performance/images.md](./performance/images.md)
  - Components far below the fold (related products, second half of product grid) should defer rendering until they enter the viewport; use `useIntersectionObserver` hook with `React.lazy`

- [ ] **Art direction with `<picture>` tag** → [performance/images.md](./performance/images.md)
  - Editorial images (hero, category banners) need different crops on mobile vs desktop; Next.js `<Image>` only resizes — use native `<picture>` with `<source media="...">` for true art direction

---

## Phase 9 — Component Documentation (Storybook)

Storybook provides a visual component catalogue and enables interaction tests that complement RTL unit tests.

- [ ] **Set up Storybook** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Install `@storybook/nextjs`; configure with the same SCSS global imports and `@/` path aliases as the app; add `storybook` and `build-storybook` scripts

- [ ] **Stories for shared components** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Write `.stories.tsx` for: `ProductCard` (default, out-of-stock, with variants), `FormField` (text, error, disabled), `ProductSkeleton`, `Navbar`, `Footer`, `EmptyState`, `Breadcrumb`, `ThemeToggle`

- [ ] **Storybook interaction tests** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Use `@storybook/test` `userEvent` + `expect` inside stories to write interaction tests; run in CI via `storybook test --ci`

---

## Phase 10 — Architecture & Advanced Real-time

Long-term architecture improvements and the two complex real-time features deferred from Phase 10 of V1.

- [ ] **`public/` folder organization** → [architecture/project-structure.md](./architecture/project-structure.md)
  - Organize `public/` into `public/icons/` (PWA icons, favicon variants), `public/images/` (static editorial images), `public/fonts/` (self-hosted WOFF2 files if not using `next/font`)

- [ ] **Zod schemas co-located with shared types** → [architecture/shared-types.md](./architecture/shared-types.md)
  - Add Zod schemas to `packages/shared-types/` alongside the TypeScript types; both frontend and backend can import the same runtime validator; no duplicated schema definitions

- [ ] **Backend NestJS DTOs derive from shared types** → [architecture/shared-types.md](./architecture/shared-types.md)
  - Backend response classes implement or extend the shared TypeScript interfaces; a type mismatch in a backend DTO causes a compile error in the shared package, surfacing in CI before it reaches production

- [ ] **WebSocket for live inventory** → [advanced/pwa-and-realtime.md](./advanced/pwa-and-realtime.md)
  - When two users view the same product, the stock count can hit zero without a refresh; use a WebSocket connection to receive real-time inventory updates and disable "Add to Cart" when stock reaches 0
  - Depends on: backend WebSocket gateway for inventory events

- [ ] **Background sync for offline cart mutations** → [advanced/pwa-and-realtime.md](./advanced/pwa-and-realtime.md)
  - When offline, cart mutations queue in IndexedDB (from Phase 6.3 of V1); the Service Worker registers a `background-sync` event; when connectivity returns the SW drains the queue even if the tab is closed
  - Depends on: IndexedDB cart queue (`data-and-state/web-storage.md`) + Service Worker (already set up via next-pwa)
