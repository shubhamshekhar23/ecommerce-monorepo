# Frontend Implementation Sequence V3

All V2 items are complete. This document sequences the 21 remaining unchecked sub-items across the topic docs — audits, UX polish, accessibility, advanced performance, and testing depth.

Each item links back to the topic doc where the full implementation detail lives.

---

## Phase 1 — Audits & Verification

No new code is written in this phase. Each item is a focused pass over existing code or a manual check in the browser. Fastest wins with the highest confidence return.

- [ ] **Bundle dependency audit** → [performance/bundle-optimization.md](./performance/bundle-optimization.md)
  - Run `ANALYZE=true npm run build` and identify the largest dependencies
  - Confirm no route imports the entire app's logic (barrel file anti-pattern)
  - Verify tree shaking is active: all imports use ES module syntax, no CommonJS `require()` in the app code
  - Check for common bloat mistakes: full lodash import, moment.js, unoptimised icon libraries

- [ ] **Submit protection audit** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Audit every form and mutation button: confirm `disabled={isPending}` is present
  - Confirm `useDebounce` (or equivalent) is wired to every search, filter, and sort input — no request fires per keystroke
  - Confirm any action that costs money or creates a record disables its trigger for the duration of the request; pattern already applied at checkout, apply everywhere else

- [ ] **Crawlable URL verification** → [seo/seo.md](./seo/seo.md)
  - Check that the category filter URL param uses a slug (`/products?category=electronics`) not a database ID (`/products?category=clcat789`)
  - Confirm the backend `/products` endpoint accepts category slugs in the filter param; align frontend if needed

- [ ] **SameSite cookie verification** → [security/security-headers.md](./security/security-headers.md)
  - Open browser DevTools → Application → Cookies while logged in
  - Confirm the refresh token cookie has `SameSite=Strict` and `Secure` flags set by the backend
  - If missing, raise with the backend team — this is a backend change in the auth cookie configuration

- [ ] **TanStack Query deduplication note** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Add a comment to `src/shared/queryClient.ts` explaining that identical in-flight queries are deduplicated automatically
  - Prevents future developers from adding manual deduplication that fights the library

- [ ] **Manual screen reader pass** → [ux/accessibility.md](./ux/accessibility.md)
  - Test the home → product listing → product detail → add to cart → checkout flow with VoiceOver (Mac) or NVDA (Windows)
  - Verify: focus order makes sense, all interactive elements are announced, error messages are read aloud, modals trap focus correctly
  - Log any failures as issues; automated axe catches ~35% of real-world a11y problems

---

## Phase 2 — Error UX Polish

The `AppError` class and category system are in place from V1. These items use the category to drive richer UI feedback — currently all errors show the same generic toast.

- [ ] **Per-category toast display rules** → [observability/error-handling.md](./observability/error-handling.md)
  - In mutation `onError` callbacks, check `error.category` and vary the toast:
    - `network` → red toast, longer duration (6s), suggest checking connection
    - `server` → red toast, shorter duration (4s), generic "something went wrong"
    - `validation` → yellow/warning toast, list the specific field errors if available
    - `auth` → no toast (redirect to login instead)
    - `business` → orange toast, show the specific business rule message from the API

- [ ] **Retry button in network-error toasts** → [observability/error-handling.md](./observability/error-handling.md)
  - For `network`-category errors only, add a "Try again" action to the toast (sonner supports action buttons)
  - The action callback re-fires the mutation — TanStack Query's `mutate` reference is stable, so pass it directly to the toast action
  - Automatic retries (from queryClient config) have already exhausted by the time the error handler fires; this is user-initiated

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
