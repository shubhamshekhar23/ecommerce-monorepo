// This file configures the Sentry SDK for the browser (client-side).
// The config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only load when a DSN is configured — avoids noise in development.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  integrations: [Sentry.browserTracingIntegration()],

  // Captures LCP, FCP, TTFB, CLS, INP per page as performance spans.
  tracesSampleRate: 0.2,

  // Replay captures session recordings for errors. Higher sample rate
  // for sessions that produce an error (0.1 = 10% otherwise).
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
