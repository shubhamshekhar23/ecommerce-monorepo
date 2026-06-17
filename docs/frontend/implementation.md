# Frontend Implementation Sequence

The app already has: auth, cart, checkout, orders, admin CRUD, full product catalogue, design tokens, JWT interceptors, and TanStack Query setup. The 36 files in `docs/frontend/` cover what still needs to be built. This file sequences them in dependency order. Mark each item `[x]` when complete.

Each item links to its topic file for full implementation detail.

---

## Phase 1 — Infrastructure

Everything downstream reads from validated env, uses `AppError`, and hits the upgraded API client. Do this first to avoid retrofitting 40+ query hooks.

- [ ] **Environment Configuration** → [architecture/environment-config.md](./architecture/environment-config.md)
  - Zod schema in `src/shared/env.ts`, derive semantic constants in `src/shared/config.ts`, startup validation check in `next.config.ts`

- [ ] **Error Handling Strategy** → [observability/error-handling.md](./observability/error-handling.md)
  - `AppError` class with `ErrorCategory` enum (validation / business / auth / network / server / unknown), upgrade `apiClient.ts` response interceptor to normalize all HTTP errors, logger utility wrapping console + Sentry

- [ ] **API & Network Strategy** → [data-and-state/api-and-network.md](./data-and-state/api-and-network.md)
  - Zod response schemas for every API endpoint (validate at the boundary), retry with exponential backoff for network errors, 10s `AbortController` timeout, `staleTime` decisions documented per query

---

## Phase 2 — Security & Legal

Security headers and auth hardening are legal/compliance requirements. Payment double-charge prevention protects real money. GDPR gates script loading for Phases 9/10.

- [ ] **Security Headers** → [security/security-headers.md](./security/security-headers.md)
  - CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` in `next.config.ts` `headers()`. Audit all `<a target="_blank">` for `rel="noopener noreferrer"`

- [ ] **Authentication Strategy** → [security/authentication.md](./security/authentication.md)
  - Silent refresh at 80% token lifetime (setTimeout in auth store), multi-tab logout sync via `storage` event, session expiry toast with `?redirect=` URL preservation

- [ ] **Payment UX** → [security/payment-ux.md](./security/payment-ux.md)
  - Disable submit button immediately on first click, `crypto.randomUUID()` idempotency key stored in `sessionStorage` sent as `X-Idempotency-Key`, Stripe error code → user-friendly message mapping, restore checkout form on refresh

- [ ] **GDPR & Cookie Consent** → [security/gdpr-and-privacy.md](./security/gdpr-and-privacy.md)
  - `CookieConsentBanner` component, `useCookieConsent` hook (localStorage), conditional GA4 + Sentry script loading based on consent

---

## Phase 3 — Performance & SEO

Rendering strategy affects every page — change it late and you're rewriting components. SEO structured data must live on the SSG/SSR pages established here.

- [ ] **Rendering Strategy** → [performance/rendering-strategy.md](./performance/rendering-strategy.md)
  - `generateStaticParams` for `/products/[slug]`, `revalidate = 3600` on `/products`, convert Header/Footer/Navbar to Server Components, `loading.tsx` per route, `<Suspense>` around data-dependent sections

- [ ] **SEO** → [seo/seo.md](./seo/seo.md)
  - `generateMetadata` per page (product, category; `noindex` for orders/account), `opengraph-image.tsx`, Product JSON-LD schema, WebSite JSON-LD in root layout, `sitemap.ts`, `robots.ts`, canonical URLs

- [ ] **Performance: Images** → [performance/images.md](./performance/images.md)
  - `formats: ['image/avif', 'image/webp']` in `next.config.ts`, `priority` prop on first ProductCard + hero images, `blurDataURL` placeholder, art direction with `<picture>` for editorial images, CDN URL helper in `config.ts`

- [ ] **Performance: Loading** → [performance/loading-and-network.md](./performance/loading-and-network.md)
  - `<link rel="preconnect">` to API + font CDN in `layout.tsx`, `font-display: swap`, `React.lazy` + `Suspense` for below-fold components, `next/script strategy="lazyOnload"` for third-party scripts

---

## Phase 4 — Accessibility & Testing

A11Y is a WCAG requirement. Testing setup must come early — all future phases should have tests from the start. CI gates enforce quality on every merge going forward.

- [ ] **Accessibility** → [ux/accessibility.md](./ux/accessibility.md)
  - Skip-to-content link in layout, heading hierarchy audit, ARIA labels on icon-only buttons (cart, search), focus trap in modals/dropdowns, visible focus ring (CSS), `aria-live` for toast, `prefers-reduced-motion`, `eslint-plugin-jsx-a11y`

- [ ] **Testing Strategy** → [testing/testing-strategy.md](./testing/testing-strategy.md)
  - Install RTL + `@testing-library/user-event` + `jest-dom`, MSW handlers per feature, tests for `ProductCard`/`LoginForm`/`CartView`, Playwright E2E (browse→cart, full checkout, auth, admin CRUD), `jest-axe` in every component test

- [ ] **CI/CD Quality Gates** → [testing/ci-cd-quality-gates.md](./testing/ci-cd-quality-gates.md)
  - GitHub Actions: `tsc --noEmit`, ESLint `--max-warnings 0`, Stylelint, Prettier `--check`, Jest `--ci --coverage` (70% threshold), Playwright E2E, `next build`, bundle size gate, `npm audit`, Dependabot, Lighthouse CI

---

## Phase 5 — UX Foundations

Shared component primitives (form inputs, toast, skeletons, empty states) are used by every feature. Get the patterns right before Phases 6-7 add more screens.

- [ ] **Form Architecture** → [ux/form-architecture.md](./ux/form-architecture.md)
  - `src/components/Form/` with `Input`, `Select`, `Textarea`, `Checkbox`, `RadioGroup`, `ErrorMessage`, `FieldGroup` as RHF Controller wrappers. Refactor `LoginForm`, `RegisterForm`, `CheckoutForm`, `ProductForm` to use them. Shared Zod schemas in `src/shared/validators.ts`

- [ ] **User Experience** → [ux/user-experience.md](./ux/user-experience.md)
  - `useScrollRestoration` hook (sessionStorage keyed by route), global toast system, React Error Boundary component per feature route, skeletons for Orders/Cart/Checkout/Admin, `useDebounce` hook in `src/hooks/`

- [ ] **Empty States & Loading** → [ux/empty-states-and-loading.md](./ux/empty-states-and-loading.md)
  - `EmptyState` component with `{ icon, title, description, action }` props, empty states for cart/orders/category/admin results, `nextjs-toploader` page transition bar, `Spinner` for button loading states

---

## Phase 6 — State & Data Improvements

Infrastructure and shared components are in place. Now improve how data flows: normalized state, URL-driven filters, offline resilience, feature flags.

- [ ] **State Management** → [data-and-state/state-management.md](./data-and-state/state-management.md)
  - Normalize cart store to `byId: Record<string, CartItem>` + `allIds: string[]`, optimistic updates for `addToCart` / `removeCartItem` / `updateCartItem` / `cancelOrder` (TanStack Query `onMutate`/`onError`/`onSettled`)

- [ ] **URL as State** → [data-and-state/url-as-state.md](./data-and-state/url-as-state.md)
  - `useUrlState` hook wrapping `router.push` + `URLSearchParams`, category/sort/price range in URL for product listing, search/status filter/page in URL for admin tables, "Clear all filters" button

- [ ] **Web Storage** → [data-and-state/web-storage.md](./data-and-state/web-storage.md)
  - `sessionStorage` for scroll position (Phase 5) and product list cache, `localStorage` for user preferences and recently viewed, IndexedDB offline cart queue (mutations queued when offline, replayed on reconnect)

- [ ] **Feature Flags** → [architecture/feature-flags.md](./architecture/feature-flags.md)
  - `FeatureFlagProvider` with typed `Flags` interface, Level 1: env vars parsed via Zod (Phase 1), `useFeatureFlag` hook, `FlagGuard` component for route-level flags

---

## Phase 7 — UX Enhancements

Polish items that build on Phase 5 component primitives and Phase 6 data patterns.

- [ ] **Search** → [ux/search.md](./ux/search.md)
  - Recent searches in `localStorage` (last 10), autocomplete suggestions dropdown with keyboard nav (Escape/arrows/Enter), highlight matched terms with `<mark>`, empty results state with CTA

- [ ] **Pagination** → [ux/pagination.md](./ux/pagination.md)
  - Dynamic page size based on viewport height, "Showing X–Y of Z results" label, cursor pagination for admin product/order/user tables

- [ ] **Breadcrumbs** → [ux/breadcrumbs.md](./ux/breadcrumbs.md)
  - `Breadcrumb` component (`<nav aria-label="Breadcrumb"><ol>`), add to product detail / order detail / admin edit pages, JSON-LD `BreadcrumbList` in `generateMetadata`

- [ ] **Concurrent Features** → [performance/concurrent-features.md](./performance/concurrent-features.md)
  - `useTransition` on search input in Header (urgent: input update, non-urgent: query), `useDeferredValue` on category sidebar filter, `isPending` opacity indicator

- [ ] **Virtualization** → [performance/virtualization.md](./performance/virtualization.md)
  - `@tanstack/react-virtual` on `AdminProductsView`, `AdminOrdersView`, `AdminUsersView`, `useVirtualizer` with `estimateSize`, absolute positioning layout

---

## Phase 8 — Architecture & Tooling

Structural refactors are best deferred until features stabilize. Bundle analysis is most useful once all features are in.

- [ ] **Project Structure** → [architecture/project-structure.md](./architecture/project-structure.md)
  - `constants/` + `mocks/` dirs per feature, `src/hooks/` for global hooks (`useDebounce`, `useScrollRestoration`, `useIntersectionObserver`, `useLocalStorage`), feature `index.ts` public API files, Husky + lint-staged, `.editorconfig`

- [ ] **Shared Types** → [architecture/shared-types.md](./architecture/shared-types.md)
  - `packages/shared-types/` monorepo package with `product.types.ts` / `order.types.ts` / `cart.types.ts` / `user.types.ts` / `auth.types.ts`, `@ecommerce/shared-types` package name, frontend imports from shared, backend DTOs implement shared interfaces

- [ ] **Bundle Optimization** → [performance/bundle-optimization.md](./performance/bundle-optimization.md)
  - `@next/bundle-analyzer` with `ANALYZE=true` script, dynamic import `@stripe/react-stripe-js`, barrel file anti-pattern audit, vendor chunk splitting in `next.config.ts`, tree shaking verification

- [ ] **Architecture Patterns** → [architecture/architecture-patterns.md](./architecture/architecture-patterns.md)
  - `mitt` event bus in `src/shared/eventBus.ts`, `useReducer` for complex cart state transitions, DDD entity/value-object/aggregate type annotations

---

## Phase 9 — Styling & Design System

All components exist by now. Expanding the design system has full context. Dark mode requires every component to use CSS custom properties consistently — do as one pass.

- [ ] **SCSS Structure** → [styling/scss-structure.md](./styling/scss-structure.md)
  - Expand `_mixins.scss` (respond-to, flex-center, truncate, visually-hidden), extract `_breakpoints.scss` + `_typography.scss`, split `globals.scss` into `_reset.scss` + `_utilities.scss`

- [ ] **Theme System** → [styling/theme-system.md](./styling/theme-system.md)
  - `[data-theme="dark"]` CSS custom property overrides, `ThemeToggle` component, `localStorage` persistence, inline script in `<head>` to prevent FOUC, z-index / elevation / animation token additions to `_variables.scss`

---

## Phase 10 — Observability & Advanced

Additive features. The app works without them. Implement once all core patterns are solid.

- [ ] **Analytics & Monitoring** → [observability/analytics-and-monitoring.md](./observability/analytics-and-monitoring.md)
  - `@sentry/nextjs`, Vercel Analytics + Speed Insights in layout, GA4 funnel events (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`), Sentry user context on login/logout
  - Depends on: Phase 2.4 (GDPR consent gates GA4 + Sentry loading)

- [ ] **Print CSS** → [ux/print-css.md](./ux/print-css.md)
  - `@media print` global reset (hide header/nav/footer/buttons), `@page` A4 margins, order detail print styles, "Print Receipt" button with `window.print()`

- [ ] **PWA & Real-time** → [advanced/pwa-and-realtime.md](./advanced/pwa-and-realtime.md)
  - SSE connection for order status updates, `manifest.ts`, Service Worker via `next-pwa`, background sync for offline cart queue (connects to Phase 6.3)

- [ ] **i18n** → [advanced/i18n.md](./advanced/i18n.md)
  - `next-intl`, `app/[locale]/` route restructure, `hreflang` in `generateMetadata`, `Intl.NumberFormat` for currency, `Intl.DateTimeFormat` for dates, CSS logical properties for RTL, `dir="rtl"` on `<html>`
