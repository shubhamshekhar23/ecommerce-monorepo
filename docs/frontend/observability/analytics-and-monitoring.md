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

- [x] **Vercel Analytics for Core Web Vitals** — since the app deploys on Vercel (or compatible), `@vercel/analytics` is the easiest way to track LCP, FID, CLS, TTFB, and FCP per page in production.
  
  Setup:
  ```tsx
  // src/app/layout.tsx
  import { Analytics } from '@vercel/analytics/react';
  // ...
  <Analytics />
  ```
  View results in the Vercel dashboard under Analytics tab.
  - Complexity: Easy (one import, one component)
  - File: `src/app/layout.tsx`

- [x] **Vercel Speed Insights** — separate from Analytics. Tracks real-user performance scores (not just lab scores from Lighthouse). Install `@vercel/speed-insights` alongside Analytics.
  - Complexity: Easy
  - File: `src/app/layout.tsx`

---

### User Behavior Analytics

- [x] **Page view and funnel tracking** — track the conversion funnel: Product View → Add to Cart → Checkout Start → Order Placed. This surfaces where users drop off.
  
  Options:
  - Google Analytics 4 (GA4) — free, widely used
  - Plausible — privacy-friendly, no cookies, GDPR-compliant out of the box
  
  For an ecommerce app learning project, GA4 with the `gtag` integration via Next.js `<Script>` is the standard path. Use `strategy="afterInteractive"` so it doesn't block rendering.
  - Complexity: Medium (setup + event tracking in each mutation `onSuccess`)
  - Key events to track: `view_product`, `add_to_cart`, `begin_checkout`, `purchase`
