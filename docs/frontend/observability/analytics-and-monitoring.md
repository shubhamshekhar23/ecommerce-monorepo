# 13 — Analytics & Monitoring

Visibility into errors and user behavior in production. Without these, you're flying blind.
Source: `others.md`

---

## Items to Implement

### Error Monitoring

- [x] **Sentry for frontend error tracking** — the notes list Sentry as the standard tool. Captures:
  - Unhandled JS errors and promise rejections
  - React component errors (via the Error Boundary integration)
  - API call failures (via Sentry's network instrumentation)
  - Source-mapped stack traces pointing to the original TypeScript line
  
  Setup: install `@sentry/nextjs`, run `npx @sentry/wizard@latest -i nextjs`. The wizard creates `sentry.client.config.ts` and `sentry.server.config.ts` automatically.
  
  Connect to Error Boundaries from `08-user-experience.md`: call `Sentry.captureException(error)` inside the boundary's `componentDidCatch`.
  - Complexity: Easy–Medium (wizard handles most setup)
  - Files: `sentry.client.config.ts`, `sentry.server.config.ts`, `next.config.js` (withSentryConfig wrapper)

---

### Performance Monitoring

- [x] **Sentry Performance for Core Web Vitals** — since Sentry is already installed, enabling performance monitoring costs zero extra setup. Sentry automatically captures LCP, FCP, TTFB, CLS, and FID as part of its performance tracing. Works on any host (Contabo, bare metal, etc.) — no Vercel dependency.
  
  Setup: set `tracesSampleRate` in your existing Sentry config:
  ```ts
  // sentry.client.config.ts
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,          // sample 20% of sessions
    integrations: [Sentry.browserTracingIntegration()],
  });
  ```
  View results in the Sentry dashboard under **Performance → Web Vitals**.
  - Complexity: Easy (already have Sentry; just add two config lines)
  - File: `sentry.client.config.ts`

- [x] **`web-vitals` library → GA4** — for a second data source, Google's `web-vitals` package lets you measure Core Web Vitals and push them into GA4 as custom events. Platform-agnostic; works on Contabo.
  
  Setup:
  ```bash
  npm install web-vitals
  ```
  ```ts
  // src/lib/vitals.ts
  import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';
  
  function sendToGA(metric: { name: string; value: number; id: string }) {
    window.gtag?.('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      non_interaction: true,
    });
  }
  
  export function reportWebVitals() {
    onCLS(sendToGA); onFCP(sendToGA); onLCP(sendToGA); onTTFB(sendToGA); onINP(sendToGA);
  }
  ```
  Call `reportWebVitals()` once in `src/app/layout.tsx` (inside a `useEffect` or via Next.js's `reportWebVitals` export).
  - Complexity: Easy–Medium
  - Files: `src/lib/vitals.ts`, `src/app/layout.tsx`

- [x] **Google Search Console** — free, zero-code option. Verify your domain once and Google surfaces field-data Core Web Vitals (real user data from Chrome) under **Experience → Core Web Vitals**. No SDK, no instrumentation. Good as a baseline sanity check alongside Sentry.
  - Complexity: Easy (domain verification only)

---

### User Behavior Analytics

- [x] **Page view and funnel tracking** — track the conversion funnel: Product View → Add to Cart → Checkout Start → Order Placed. This surfaces where users drop off.
  
  Options:
  - Google Analytics 4 (GA4) — free, widely used
  - Plausible — privacy-friendly, no cookies, GDPR-compliant out of the box
  
  For an ecommerce app learning project, GA4 with the `gtag` integration via Next.js `<Script>` is the standard path. Use `strategy="afterInteractive"` so it doesn't block rendering.
  - Complexity: Medium (setup + event tracking in each mutation `onSuccess`)
  - Key events to track: `view_product`, `add_to_cart`, `begin_checkout`, `purchase`

---

## Admin Observability Panels

The backend exposes admin-gated endpoints for queue health and database diagnostics. These give the team visibility into system internals without needing direct server access.

### Queue Monitoring

- [x] **Queue stats and dead-letter queue UI** → `GET /admin/queue/stats`, `GET /admin/queue/dlq`, `POST /admin/queue/dlq/:jobId/retry`, `POST /admin/queue/dlq/clear`
  - Create `app/[locale]/admin/queue/page.tsx`
  - **Queue stats section** (`GET /admin/queue/stats`): shows active, waiting, completed, and failed job counts per queue (STOCK_ALERTS, INVOICE, CART_RECOVERY); auto-refreshes every 10 seconds via `refetchInterval`
  - **Dead-letter queue section** (`GET /admin/queue/dlq`): table of failed jobs that exhausted all retries; columns: job ID, queue name, failure reason, failed at timestamp
  - Per-row "Retry" button calls `POST /admin/queue/dlq/:jobId/retry` — re-enqueues the job from scratch
  - "Clear all failed" button calls `POST /admin/queue/dlq/clear` with a confirmation dialog
  - Add "Queue" link under a "System" section in `AdminNav.tsx`
  - Create `features/admin/hooks/useQueueStats.ts` (polled query), `useDlqJobs.ts`, `useRetryDlqJob.ts`, `useClearDlq.ts`
  - Complexity: Medium

### DB Analytics

- [x] **Database analytics panel** → `GET /admin/db/slow-queries`, `POST /admin/db/reset-stats`, `GET /admin/db/table-stats`, `GET /admin/db/replication/lag`, `GET /admin/db/replication/status`, `GET /admin/db/partitions`, `POST /admin/db/partitions/create-next`
  - Create `app/[locale]/admin/db-analytics/page.tsx` with four collapsible sections:
  - **Slow queries** (`GET /admin/db/slow-queries`): table with columns query, calls, mean time (ms), total time (ms); "Reset stats" button calls `POST /admin/db/reset-stats`
  - **Table stats** (`GET /admin/db/table-stats`): table with columns table name, live rows, dead rows (bloat indicator), last vacuum, last analyze
  - **Replication** (`GET /admin/db/replication/lag` + `GET /admin/db/replication/status`): side-by-side tiles showing replica lag in MB with colour coding — green < 10 MB, amber < 100 MB, red ≥ 100 MB
  - **Partitions** (`GET /admin/db/partitions`): list of existing partitions with row counts; "Create next partition" button calls `POST /admin/db/partitions/create-next`
  - All sections refresh every 30 seconds; show "Last refreshed at [time]" beneath each heading
  - Add "DB Analytics" link under the "System" section in `AdminNav.tsx`
  - Create `features/admin/hooks/useDbAnalytics.ts` with individual sub-hooks per section
  - Complexity: Medium
