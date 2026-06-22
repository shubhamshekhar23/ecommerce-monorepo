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

- [x] **`prefers-color-scheme` as initial theme default** → [ux/accessibility.md](./ux/accessibility.md)
  - `getInitialTheme()` reads localStorage first; falls back to `window.matchMedia(prefers-color-scheme:dark)` — was already present
  - Added: `matchMedia` `change` listener in useTheme updates the theme live when the OS preference changes, but only if the user has no explicit localStorage override
  - Fixed: localStorage was previously written on every mount (not just on toggle), which meant the OS listener could never apply on return visits. Now localStorage is only written inside `toggleTheme()`
  - FOUC-prevention script in layout.tsx already reads matchMedia as fallback when localStorage is empty — no change needed there

---

## Phase 4 — Advanced Performance

These items are measurable-first: don't implement until a Lighthouse run or real user metric shows the problem. The descriptions explain what threshold triggers each.

- [x] **Adaptive images by connection speed** → [performance/images.md](./performance/images.md)
  - `useImageQuality` hook in `src/hooks/useConnectionQuality.ts` reads `navigator.connection.effectiveType` and `saveData`; returns 40 on slow-2g/2g/saveData, 80 otherwise
  - Graceful fallback: when Network Information API is unavailable (Firefox, Safari), defaults to 80
  - Wired to `ProductCard` and `ProductImageGallery` via `quality={imageQuality}` prop on `<Image>`
  - Live listener: `connection` `change` event updates quality in real time when network degrades

- [x] **CDN image transformations** → [performance/images.md](./performance/images.md)
  - `buildImageUrl(src, { width?, quality? })` utility in `src/shared/buildImageUrl.ts` — Cloudinary fetch-URL pattern; falls through to original URL when `NEXT_PUBLIC_IMAGE_CDN_URL` is not set
  - Wired to `ProductCard` (src) and `ProductImageGallery` (src); all images route through this single function so switching CDN providers is a one-function change
  - `next.config.ts` remotePatterns includes commented example entries for Cloudinary and Imgix
  - `.env.example` documents `NEXT_PUBLIC_IMAGE_CDN_URL` with Cloudinary and Imgix examples

- [x] **Web Worker for cart total computation** → [performance/loading-and-network.md](./performance/loading-and-network.md)
  - `src/workers/cartTotals.worker.ts` — receives `CartItem[]` via postMessage, computes `{ itemCount, totalPrice }` off the main thread
  - `useCartTotalsWorker(items)` hook creates the worker on mount, posts items on change, terminates on unmount; returns null until first worker response
  - Wired to `CartSummary` — falls back to `cart.totalPrice` (backend value) on the first tick; optimistic-update mutations continue using synchronous `recalcCartTotals` (unchanged)

- [x] **Grid virtualization for large product lists** → [performance/virtualization.md](./performance/virtualization.md)
  - `useWindowVirtualizer` (page-scroll, no fixed container) virtualizes by ROWS; `useColumnCount` hook mirrors the CSS breakpoints (4/3/2/1) so row grouping stays in sync
  - Row height estimated per column count; `measureElement` ref lets the virtualizer self-correct after first paint
  - Skeleton loading state preserves the original CSS grid layout (`skeletonGrid` class)
  - `react-window` remains documented as alternative for fixed-height scenarios

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
