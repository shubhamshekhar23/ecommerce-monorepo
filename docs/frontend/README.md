# Frontend Implementation Tracker

Tracks all frontend patterns and improvements for `apps/frontend`.
Each file maps to one topic area. Items are marked `[x]` when complete.

---

## Folder Structure

```
docs/frontend/
  architecture/     — project setup, patterns, config, shared types, feature flags
  performance/      — speed, loading, rendering, bundles, virtualization
  styling/          — SCSS structure, design tokens, theme system
  data-and-state/   — state management, API layer, storage, URL state
  ux/               — user experience, accessibility, forms, search, empty states
  security/         — HTTP headers, auth strategy, payment, GDPR
  seo/              — SEO, metadata, structured data, sitemap
  testing/          — testing strategy, CI/CD quality gates
  observability/    — analytics, monitoring, error handling
  advanced/         — PWA, real-time, internationalisation
```

---

## Priority Order

Work through groups in order. Within each group, top-to-bottom.

### Priority 1 — Foundational

- [Rendering Strategy](./performance/rendering-strategy.md) — SSG, ISR, Server Components, Suspense
- [SEO](./seo/seo.md) — metadata, structured data, sitemap, robots
- [Security Headers](./security/security-headers.md) — HTTP headers, external links, cookie flags
- [Accessibility](./ux/accessibility.md) — semantic HTML, ARIA, keyboard nav, focus trap, A11Y testing
- [Performance: Images](./performance/images.md) — AVIF, priority prop, blur placeholder, art direction
- [Authentication Strategy](./security/authentication.md) — refresh tokens, silent refresh, multi-tab sync
- [Environment Configuration](./architecture/environment-config.md) — Zod-validated env, typed config module
- [Error Handling Strategy](./observability/error-handling.md) — error classification, unified display, logging

### Priority 2 — Core Patterns

- [State Management](./data-and-state/state-management.md) — normalized state, optimistic updates
- [Performance: Loading](./performance/loading-and-network.md) — preconnect, lazy components, fonts
- [User Experience](./ux/user-experience.md) — scroll restore, skeletons, toast, error boundaries
- [Payment UX](./security/payment-ux.md) — double-payment prevention, idempotency, recovery
- [Testing Strategy](./testing/testing-strategy.md) — unit, component, E2E, accessibility, Storybook
- [CI/CD Quality Gates](./testing/ci-cd-quality-gates.md) — lint, typecheck, coverage, Lighthouse CI
- [Feature Flags](./architecture/feature-flags.md) — FeatureFlagProvider, env-based flags
- [API & Network Strategy](./data-and-state/api-and-network.md) — API layer, retry, deduplication, Zod validation
- [Form Architecture](./ux/form-architecture.md) — shared Input, Select, Checkbox, ErrorMessage
- [Bundle Optimization](./performance/bundle-optimization.md) — analyzer, code splitting, tree shaking

### Priority 3 — Enhancements

- [Project Structure](./architecture/project-structure.md) — constants, mocks, utils, shared hooks, tooling
- [SCSS Structure](./styling/scss-structure.md) — mixins, breakpoints, utilities, typography
- [Theme System](./styling/theme-system.md) — dark mode, CSS variable overrides, theme toggle
- [URL as State](./data-and-state/url-as-state.md) — filter/sort/pagination in URL params
- [Concurrent Features](./performance/concurrent-features.md) — useTransition, useDeferredValue
- [Pagination](./ux/pagination.md) — dynamic viewport count, admin cursor pagination
- [Virtualization](./performance/virtualization.md) — TanStack Virtual for admin lists
- [Search](./ux/search.md) — history, suggestions, highlight, empty state
- [Breadcrumbs](./ux/breadcrumbs.md) — component, JSON-LD BreadcrumbList
- [Empty States & Loading](./ux/empty-states-and-loading.md) — EmptyState component, loading UI guide
- [Web Storage](./data-and-state/web-storage.md) — sessionStorage, localStorage, IndexedDB

### Priority 4 — Advanced

- [Shared Types](./architecture/shared-types.md) — monorepo packages/shared-types, Zod schemas
- [Architecture Patterns](./architecture/architecture-patterns.md) — feature index, event bus, DDD, useReducer
- [i18n](./advanced/i18n.md) — locale routing, formatting, RTL support
- [PWA & Real-time](./advanced/pwa-and-realtime.md) — SSE, Service Worker, manifest, background sync
- [Analytics & Monitoring](./observability/analytics-and-monitoring.md) — Sentry, Vercel Analytics, GA4
- [GDPR & Cookie Consent](./security/gdpr-and-privacy.md) — consent banner, conditional script loading
- [Print CSS](./ux/print-css.md) — order receipt print styles

---

## Full File Index

### architecture/
- [Project Structure](./architecture/project-structure.md)
- [Architecture Patterns](./architecture/architecture-patterns.md)
- [Environment Configuration](./architecture/environment-config.md)
- [Shared Types](./architecture/shared-types.md)
- [Feature Flags](./architecture/feature-flags.md)

### performance/
- [Images](./performance/images.md)
- [Loading & Network](./performance/loading-and-network.md)
- [Rendering Strategy](./performance/rendering-strategy.md)
- [Bundle Optimization](./performance/bundle-optimization.md)
- [Virtualization](./performance/virtualization.md)
- [Concurrent Features](./performance/concurrent-features.md)

### styling/
- [SCSS Structure](./styling/scss-structure.md)
- [Theme System](./styling/theme-system.md)

### data-and-state/
- [State Management](./data-and-state/state-management.md)
- [API & Network Strategy](./data-and-state/api-and-network.md)
- [Web Storage](./data-and-state/web-storage.md)
- [URL as State](./data-and-state/url-as-state.md)

### ux/
- [User Experience](./ux/user-experience.md)
- [Accessibility](./ux/accessibility.md)
- [Form Architecture](./ux/form-architecture.md)
- [Pagination](./ux/pagination.md)
- [Search](./ux/search.md)
- [Empty States & Loading](./ux/empty-states-and-loading.md)
- [Breadcrumbs](./ux/breadcrumbs.md)
- [Print CSS](./ux/print-css.md)

### security/
- [Security Headers](./security/security-headers.md)
- [Authentication Strategy](./security/authentication.md)
- [Payment UX](./security/payment-ux.md)
- [GDPR & Cookie Consent](./security/gdpr-and-privacy.md)

### seo/
- [SEO](./seo/seo.md)

### testing/
- [Testing Strategy](./testing/testing-strategy.md)
- [CI/CD Quality Gates](./testing/ci-cd-quality-gates.md)

### observability/
- [Analytics & Monitoring](./observability/analytics-and-monitoring.md)
- [Error Handling Strategy](./observability/error-handling.md)

### advanced/
- [PWA & Real-time](./advanced/pwa-and-realtime.md)
- [i18n](./advanced/i18n.md)
