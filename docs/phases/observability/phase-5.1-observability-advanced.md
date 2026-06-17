# Phase 5.1 — Observability Advanced

**Status:** ✅ Done
**Builds on:** [Phase 5 — Observability](./phase-5-observability.md)
**Concept cluster:** Two gaps in the current observability stack — unhandled exceptions disappear into log streams with no grouping or error-rate alerting, and PII can leak into those same streams.

---

## Sentry Global Exception Filter

**What:** Add a NestJS global exception filter that captures unhandled exceptions and reports them to Sentry with full request context: URL, method, user ID, and stack trace. Configure sampling and release tracking so Sentry errors can be correlated with deployments.

**Why:** Pino logs are append-only streams — finding all occurrences of a specific error requires grepping across an aggregated log system. Sentry groups identical errors by stack trace, tracks affected user count, and alerts on error-rate spikes. Critically: Sentry shows you *which deployment introduced a regression*, Pino does not.

**Approach:**
- Install `@sentry/nestjs`.
- Initialize in `tracing.ts` (before NestJS boots):

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,          // set in CI: git SHA or semver
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  profilesSampleRate: 0.05,
});
```

- `SENTRY_TRACES_SAMPLE_RATE` is configurable via env so production (0.01) vs staging (1.0) can differ without code changes.
- Create `SentryExceptionFilter implements ExceptionFilter`:
  - Skip `HttpException` with status < 500 — these are expected client errors.
  - `Sentry.setUser({ id: request.headers['x-user-id'] })` before `captureException`.
  - Delegate response formatting to the existing `HttpExceptionFilter`.
- Register as the outermost global filter in `main.ts`.
- In CI (`ci.yml`): after a successful deploy, call `sentry-cli releases finalize $APP_VERSION` to mark the release in Sentry — errors after this point will be attributed to the new version.

**Key files:**
- `apps/backend/src/tracing.ts` — add `Sentry.init()` with configurable sampling + release
- `apps/backend/src/common/filters/sentry-exception.filter.ts` — new filter
- `apps/backend/src/main.ts` — register global filter
- `apps/backend/package.json` — add `@sentry/nestjs`
- `apps/backend/.env.example` — add `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `APP_VERSION`
- `.github/workflows/ci.yml` — add `sentry-cli releases finalize` post-deploy step

---

## Pino PII Log Redaction

**What:** Configure Pino's built-in `redact` option to strip sensitive fields from log lines before they reach any transport — preventing passwords, tokens, email addresses, and cookies from appearing in log aggregators.

**Why:** Log aggregators (Loki, CloudWatch, Datadog Logs) are often less strictly access-controlled than the primary database. PII in logs widens the blast radius of a log system breach. Under GDPR, user email addresses in HTTP request logs are personal data. Pino `redact` handles this at the serialization layer — values are replaced before any transport, sink, or stdout sees them.

**Redact list:**

```typescript
redact: {
  paths: [
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.confirmPassword',
    'req.body.email',
    'req.body.cardNumber',
    'req.body.cvv',
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-user-email"]',
    'res.headers["set-cookie"]',
  ],
  censor: '[REDACTED]',
}
```

- Apply the same config in `apps/auth-service` — the auth service handles the most sensitive payloads (passwords, refresh tokens, TOTP codes).
- Verify: `POST /api/v1/auth/login` → check log output does not contain the plaintext password.
- Do NOT redact `x-user-id` — user IDs are non-sensitive reference identifiers needed for debugging.

**Key files:**
- `apps/backend/src/modules/logger/logger.module.ts` — add `redact` config
- `apps/auth-service/src/app.module.ts` — same redact config
