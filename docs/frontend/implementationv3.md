# Frontend Implementation Sequence V3

All V2 items are complete. This document sequences the 21 remaining unchecked sub-items across the topic docs — audits, UX polish, accessibility, advanced performance, and testing depth.

Each item links back to the topic doc where the full implementation detail lives.

---

## Phase 1 — Audits & Verification

No new code is written in this phase. Each item is a focused pass over existing code or a manual check in the browser. Fastest wins with the highest confidence return.

- [x] **Bundle dependency audit** → [performance/bundle-optimization.md](./performance/bundle-optimization.md)
  - No barrel anti-patterns in pages; no CommonJS require(); no lodash/moment
  - `import * as Sentry` is the correct Sentry pattern (tree-shakes internally); `import * as Label from @radix-ui/react-label` is scoped to two components only — both acceptable
  - Tree shaking active: all app code uses ES module syntax

- [x] **Submit protection audit** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - All mutation buttons confirmed disabled while isPending: login, register, add-to-cart, cancel order, admin product/category forms, admin delete buttons
  - Search debounced at 300ms via useDebounce in SearchBar; category/sort are discrete click events (no debounce needed)
  - Checkout and all destructive actions already gated

- [x] **Crawlable URL verification** → [seo/seo.md](./seo/seo.md)
  - URL param is slug-based: `/products?category=electronics` ✓
  - Frontend resolves slug → categoryId internally before the API call (ProductsView line 50); backend never receives raw slugs in this query

- [x] **SameSite cookie verification** → [security/security-headers.md](./security/security-headers.md)
  - N/A for this architecture: the app stores JWTs in localStorage (not httpOnly cookies)
  - The only cookie set is a client-side session indicator with `SameSite=Lax` — correct for a non-httpOnly navigation hint
  - No server-set cookies exist; SameSite=Strict enforcement would require switching to httpOnly cookies (a future architectural decision)

- [x] **TanStack Query deduplication note** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Added block comment to `src/shared/queryClient.ts` explaining automatic deduplication of identical in-flight queries

- [x] **Manual screen reader pass** → [ux/accessibility.md](./ux/accessibility.md)
  - Code audit passed: gallery thumbnail buttons have `aria-label="View image N"`, sidebar toggle has `aria-expanded`, all text buttons have visible labels, aria-live regions present on all loading states
  - Remaining: manual VoiceOver/NVDA walkthrough of the full purchase journey — run periodically; no automated tool can replace it

---

## Phase 2 — Error UX Polish

The `AppError` class and category system are in place from V1. These items use the category to drive richer UI feedback — currently all errors show the same generic toast.

- [x] **Per-category toast display rules** → [observability/error-handling.md](./observability/error-handling.md)
  - `network` → `toast.error()` duration 6s; `server` → `toast.error()` duration 4s; `validation` → `toast.warning()` (yellow); `business` → `toast.error()` (red, specific message); `auth` → redirect, no toast
  - All mutation hooks wired: useLogin, useRegister, useUpdateCartItem, useRemoveCartItem, useCreateOrder now route through handleMutationError

- [x] **Retry button in network-error toasts** → [observability/error-handling.md](./observability/error-handling.md)
  - Network errors show "Try Again" action button that re-fires the mutation via stable mutate reference
  - Server errors no longer get a retry button (narrowed from previous implementation to match spec — server-side errors rarely benefit from an immediate retry)
  - useCreateOrder retry is safe: idempotency key in sessionStorage prevents duplicate orders

---

## Phase 3 — Accessibility

One code item that extends the theme system already built in V2.

- [ ] **`prefers-color-scheme` as initial theme default** → [ux/accessibility.md](./ux/accessibility.md)
  - Before the user has ever set a preference, the ThemeToggle should default to the OS dark/light setting
  - Read `window.matchMedia('(prefers-color-scheme: dark)').matches` in the theme store's initial state
  - After the user manually toggles, persist their choice in `localStorage` — the persisted value takes priority over the OS setting on subsequent visits
  - Wire a `matchMedia` listener so the theme updates live if the OS preference changes while the tab is open

---

## Phase 4 — Advanced Performance

These items are measurable-first: don't implement until a Lighthouse run or real user metric shows the problem. The descriptions explain what threshold triggers each.

- [ ] **Adaptive images by connection speed** → [performance/images.md](./performance/images.md)
  - Use the Network Information API (`navigator.connection.effectiveType`) to serve a lower-quality image on `slow-2g` and `2g` connections
  - Pass a `quality` prop to Next.js `<Image>` based on the connection tier: `quality={isSlowConnection ? 40 : 80}`
  - Gate behind a feature flag initially — the API is not supported in Firefox/Safari and requires a graceful fallback

- [ ] **CDN image transformations** → [performance/images.md](./performance/images.md)
  - Instead of storing pre-cropped variants, use a CDN that transforms on the fly (Cloudinary, Imgix, or Bunny.net)
  - The image `src` becomes a URL with width/quality params: `https://res.cloudinary.com/demo/image/fetch/w_400,q_auto/<original-url>`
  - Update `next.config.ts` `images.remotePatterns` to include the CDN domain
  - This enables serving WebP/AVIF with correct dimensions without pre-processing on upload

- [ ] **Web Worker for cart total computation** → [performance/loading-and-network.md](./performance/loading-and-network.md)
  - Trigger point: cart total + discount computation visibly delays input on low-end Android (measure with Chrome DevTools CPU throttle 4× slowdown)
  - If confirmed slow: move `recalcCartTotals` from `cart.normalize.ts` into a Web Worker via `comlink`
  - The main thread posts the cart items array and receives the totals asynchronously
  - Do not implement speculatively — measure first

- [ ] **Grid virtualization for large product lists** → [performance/virtualization.md](./performance/virtualization.md)
  - Trigger point: Lighthouse TTI or INP degrades when the cursor list has accumulated more than ~200 products across multiple Load More clicks
  - Use `@tanstack/react-virtual` (already installed) with `useVirtualizer` on the product grid container
  - The sentinel div approach for Load More still works — virtualization only affects what's rendered in the DOM at a time
  - `react-window` is the established alternative if `@tanstack/react-virtual` doesn't fit the grid layout; document the choice

---

## Phase 5 — Testing Depth

These items add performance assertions to the existing Playwright E2E suite and unit test suite — catching regressions in render performance before they reach production.

- [ ] **Playwright `page.metrics()` performance assertions** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - After each major navigation step in E2E tests, call `page.metrics()` and assert on `TaskDuration` and `ScriptDuration`
  - Set soft thresholds: warn (not fail) if a page navigation takes >2s of scripting time
  - Focus on the product listing → product detail navigation — this is the highest-traffic journey

- [ ] **React Profiler render-count assertions in unit tests** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Wrap `ProductCard`, `CartItemRow`, and `ProductDetailView` with `<React.Profiler>` in their RTL tests
  - Assert that rendering a product list of 10 items causes ≤10 `onRender` calls (no unnecessary re-renders from parent state changes)
  - Catches missing `React.memo` and unstable prop references before they compound into visible jank
