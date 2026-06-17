# 04 — Performance: Loading & Network

Reduce latency on first load by giving the browser early signals about what resources it will need.
Source: `pre-load-fetch-connect.md`, `async-defer.md`, `performance-optimziation.md`

---

## Core Concepts from Notes

- **`preconnect`** — tells the browser to open a TCP + TLS connection to a domain early, before any resource from that domain is requested. Eliminates the handshake latency (~100–300ms) from the first API call.
- **`dns-prefetch`** — lighter version: only resolves the DNS, skips TCP/TLS. Used as fallback for browsers that don't support preconnect, or for third-party domains.
- **`preload`** — tells the browser to fetch a specific resource immediately as high priority. Use for resources that are discovered late (fonts embedded in CSS, hero images referenced in JS).
- **`defer` vs `async`** — `defer` fetches in parallel but executes in order after HTML is parsed. `async` fetches in parallel and executes immediately when downloaded (can interrupt parsing). Next.js handles this automatically, but third-party scripts need explicit strategy.
- **`font-display: swap`** — prevents Flash of Invisible Text (FOIT). Shows fallback font immediately, swaps to custom font when loaded.

---

## Items to Implement

- [ ] **`<link rel="preconnect">` to API origin in `layout.tsx`** — the backend API domain is known at build time. Add to the `<head>` in `app/layout.tsx`:
  ```html
  <link rel="preconnect" href="https://api.yourdomain.com" />
  ```
  This eliminates the TCP+TLS handshake cost from the very first API call the app makes.
  - Complexity: Easy
  - File: `src/app/layout.tsx`

- [ ] **`<link rel="dns-prefetch">` as fallback** — add alongside preconnect for browsers that don't support it:
  ```html
  <link rel="dns-prefetch" href="https://api.yourdomain.com" />
  ```
  Also add for any CDN or third-party domain (Google Fonts, Stripe JS, etc.).
  - Complexity: Easy
  - File: `src/app/layout.tsx`

- [ ] **`<link rel="preload">` for critical fonts** — `Plus Jakarta Sans` and `Fraunces` are loaded via CSS `@font-face` or Google Fonts. The browser doesn't discover them until it parses the CSS. Preloading fetches the WOFF2 files immediately:
  ```html
  <link rel="preload" href="/fonts/PlusJakartaSans.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
  ```
  If staying on Google Fonts, add `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />` instead.
  - Complexity: Easy–Medium (depends on whether fonts are self-hosted or CDN)
  - File: `src/app/layout.tsx`

- [ ] **`font-display: swap` on custom fonts** — if using self-hosted fonts via `@font-face`, add `font-display: swap`. If using Next.js `next/font`, it handles this automatically. Audit current font loading method.
  - Complexity: Easy
  - File: `src/styles/globals.scss` or `src/app/layout.tsx` (depending on font loading method)

- [ ] **`React.lazy` + `Suspense` for heavy route components** — these components include large dependencies and don't need to be in the initial bundle:
  - `CheckoutView` — loads Stripe JS (`@stripe/stripe-js`)
  - Admin views (`AdminProductsView`, `AdminOrdersView`, `AdminUsersView`) — only accessible to admins
  - `ProductImageGallery` — image gallery with lightbox logic
  
  Wrap with `React.lazy(() => import(...))` and a `<Suspense fallback={<Skeleton />}>` boundary.
  - Complexity: Medium
  - Files: checkout page, admin pages

- [ ] **`loading.tsx` per route segment** — Next.js App Router supports a `loading.tsx` file in any route segment. It automatically wraps the page in a Suspense boundary, showing the loading UI while the page component fetches data. Add:
  - `app/products/loading.tsx`
  - `app/orders/loading.tsx`
  - `app/cart/loading.tsx`
  - `app/checkout/loading.tsx`
  - `app/admin/loading.tsx`
  - Complexity: Easy

- [ ] **Next.js `<Script>` component with strategy for third-party scripts** — when Sentry, analytics, or any other third-party script is added (see `13-analytics-monitoring.md`), use:
  - `strategy="afterInteractive"` — for scripts that need the page to be interactive (analytics, error tracking)
  - `strategy="lazyOnload"` — for scripts that can wait until the browser is idle (chat widgets, non-critical tracking)
  - Never use a raw `<script>` tag in the app layout.
  - Complexity: Easy (relevant when adding scripts from Priority 4)

- [ ] **Web Worker for heavy cart computation** — if the cart grows large (many items, complex discount rules, shipping matrix lookups), move total calculation off the main thread into a Web Worker. The main thread stays responsive during calculation.
  - Complexity: Complex
  - Defer until cart calculation becomes measurably slow (measure first with Lighthouse)
