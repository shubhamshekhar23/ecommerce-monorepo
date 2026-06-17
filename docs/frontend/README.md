# Frontend Implementation Tracker

Tracks all frontend patterns and improvements for `apps/frontend`.
Each file maps to one topic area. Items are marked `[x]` when complete.

---

## Priority Order

Work through groups in order. Within each group, top-to-bottom.

### Priority 1 — Foundational

These unlock everything else or have legal/security weight.

- [Rendering Strategy](./05-rendering-strategy.md) — SSG, ISR, Server Components, Suspense
- [SEO](./10-seo.md) — metadata, structured data, sitemap, robots
- [Security](./09-security.md) — HTTP headers, external links, cookie flags
- [Accessibility](./15-accessibility.md) — semantic HTML, ARIA, keyboard nav, focus trap, A11Y testing
- [Performance: Images](./03-performance-images.md) — AVIF, priority prop, blur placeholder
- [Authentication Strategy](./18-authentication-strategy.md) — refresh tokens, silent refresh, multi-tab sync
- [Environment Configuration](./25-environment-config.md) — Zod-validated env, typed config module
- [Error Handling Strategy](./20-error-handling-strategy.md) — error classification, unified display, logging

### Priority 2 — Core Patterns

High learning value. Directly visible to users or to the CI pipeline.

- [State Management](./06-state-management.md) — normalized state, optimistic updates
- [Performance: Loading](./04-performance-loading.md) — preconnect, lazy components, fonts
- [User Experience](./08-user-experience.md) — scroll restore, skeletons, toast, error boundaries
- [Payment UX](./19-payment-ux.md) — double-payment prevention, idempotency, recovery
- [Testing](./16-testing.md) — unit, component, E2E, accessibility, Storybook
- [CI/CD Quality Gates](./17-ci-cd-quality-gates.md) — lint, typecheck, coverage, Lighthouse CI
- [Feature Flags](./21-feature-flags.md) — FeatureFlagProvider, env-based flags
- [API & Network Strategy](./22-api-network-strategy.md) — API layer, retry, deduplication, Zod validation
- [Form Architecture](./26-form-architecture.md) — shared Input, Select, Checkbox, ErrorMessage
- [Bundle Optimization](./27-bundle-optimization.md) — analyzer, code splitting, tree shaking

### Priority 3 — Enhancements

Structural improvements, UX polish, developer experience.

- [Project Structure](./01-project-structure.md) — constants, mocks, utils, shared hooks, tooling
- [Styling](./02-styling.md) — mixins, breakpoints, utilities, typography
- [Theme System](./24-theme-system.md) — dark mode, CSS variable overrides, theme toggle, flash prevention
- [URL as State](./30-url-state.md) — filter/sort/pagination in URL params, useUrlState hook
- [Concurrent Features](./31-concurrent-features.md) — useTransition, useDeferredValue for search/filter
- [Pagination](./07-pagination.md) — dynamic viewport count, admin cursor pagination
- [Virtualization](./28-virtualization.md) — TanStack Virtual for admin lists
- [Search Optimization](./32-search-optimization.md) — history, suggestions, highlight, empty state
- [Breadcrumbs](./34-breadcrumbs.md) — component, JSON-LD BreadcrumbList
- [Empty States & Loading Strategy](./33-empty-states-loading.md) — EmptyState component, loading UI guide
- [Web Storage](./11-web-storage.md) — sessionStorage, localStorage prefs, IndexedDB offline queue

### Priority 4 — Advanced

Higher effort. Build on top of Priority 1–3 being solid.

- [Shared Types (Monorepo)](./29-shared-types.md) — packages/shared-types, Zod schemas across apps
- [i18n](./23-i18n.md) — locale routing, formatting, RTL support
- [PWA & Real-time](./12-pwa-realtime.md) — SSE, Service Worker, manifest, background sync
- [Analytics & Monitoring](./13-analytics-monitoring.md) — Sentry, Vercel Analytics, GA4
- [GDPR & Cookie Consent](./36-gdpr-cookie-consent.md) — consent banner, conditional script loading
- [Architecture Patterns](./14-architecture-patterns.md) — feature index, event bus, DDD, useReducer
- [Print CSS](./35-print-css.md) — order receipt print styles

---

## Full File Index

- [01 — Project Structure](./01-project-structure.md)
- [02 — Styling](./02-styling.md)
- [03 — Performance: Images](./03-performance-images.md)
- [04 — Performance: Loading & Network](./04-performance-loading.md)
- [05 — Rendering Strategy](./05-rendering-strategy.md)
- [06 — State Management](./06-state-management.md)
- [07 — Pagination](./07-pagination.md)
- [08 — User Experience](./08-user-experience.md)
- [09 — Security](./09-security.md)
- [10 — SEO](./10-seo.md)
- [11 — Web Storage](./11-web-storage.md)
- [12 — PWA & Real-time](./12-pwa-realtime.md)
- [13 — Analytics & Monitoring](./13-analytics-monitoring.md)
- [14 — Architecture Patterns](./14-architecture-patterns.md)
- [15 — Accessibility](./15-accessibility.md)
- [16 — Testing](./16-testing.md)
- [17 — CI/CD Quality Gates](./17-ci-cd-quality-gates.md)
- [18 — Authentication Strategy](./18-authentication-strategy.md)
- [19 — Payment UX](./19-payment-ux.md)
- [20 — Error Handling Strategy & Logging](./20-error-handling-strategy.md)
- [21 — Feature Flags](./21-feature-flags.md)
- [22 — API & Network Strategy](./22-api-network-strategy.md)
- [23 — i18n](./23-i18n.md)
- [24 — Theme System](./24-theme-system.md)
- [25 — Environment Configuration](./25-environment-config.md)
- [26 — Form Architecture](./26-form-architecture.md)
- [27 — Bundle Optimization](./27-bundle-optimization.md)
- [28 — Virtualization](./28-virtualization.md)
- [29 — Shared Types (Monorepo)](./29-shared-types.md)
- [30 — URL as State](./30-url-state.md)
- [31 — Concurrent Features](./31-concurrent-features.md)
- [32 — Search Optimization](./32-search-optimization.md)
- [33 — Empty States & Loading Strategy](./33-empty-states-loading.md)
- [34 — Breadcrumbs](./34-breadcrumbs.md)
- [35 — Print CSS](./35-print-css.md)
- [36 — GDPR & Cookie Consent](./36-gdpr-cookie-consent.md)
