# Phase 5.1 — Observability Advanced

**Status:** 🔲 Pending
**Builds on:** [Phase 5 — Observability](./phase-5-observability.md)
**Concept cluster:** Two gaps in the current observability stack — unhandled exceptions disappear into log streams with no grouping or alerting, and PII can leak into those same log streams.

---

## Sentry Global Exception Filter

**What:** Add a NestJS global exception filter that captures unhandled exceptions and reports them to Sentry (or self-hosted Glitchtip) with full request context: URL, method, user ID, and stack trace.

**Why:** Pino logs are append-only streams — finding all occurrences of a specific error requires grepping across aggregated logs. Sentry groups identical errors by stack trace, tracks the number of affected users, and can alert on error-rate spikes. The difference: Pino tells you *that* an error happened; Sentry tells you *how often*, *for whom*, and *whether it's getting worse*.

**Approach:**
- Install `@sentry/nestjs`.
- Initialize in `tracing.ts` (before NestJS boots): `Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 })`.
- Create `SentryExceptionFilter implements ExceptionFilter`:
  - Skip `HttpException` with status < 500 — these are expected client errors, not bugs.
  - `Sentry.setUser({ id: request.headers['x-user-id'] })` before `captureException`.
  - Delegate response formatting to the existing `HttpExceptionFilter`.
- Register as the first global filter in `main.ts` (NestJS runs filters in reverse registration order, so first registered = outermost = runs last in the chain, which is what we want for Sentry).

**Key files:**
- `apps/backend/src/tracing.ts` — add `Sentry.init()`
- `apps/backend/src/common/filters/sentry-exception.filter.ts` — new filter
- `apps/backend/src/main.ts` — `app.useGlobalFilters(new SentryExceptionFilter(), new HttpExceptionFilter())`
- `apps/backend/package.json` — add `@sentry/nestjs`
- `apps/backend/.env.example` — add `SENTRY_DSN`

---

## Pino PII Log Redaction

**What:** Configure Pino's built-in `redact` option to strip sensitive fields from log lines before they are written to any transport — preventing passwords, tokens, and email addresses from appearing in log aggregators.

**Why:** Log aggregators (Loki, CloudWatch, Datadog Logs) are often less strictly access-controlled than the primary database. PII in logs widens the blast radius of a log system breach. Under GDPR, user email addresses in HTTP request logs are personal data — they need either redaction or a legal basis for processing. Pino `redact` handles this at the serialization layer: the values are replaced before any transport sees them.

**Approach:**
- In `LoggerModule` Pino config, add the `redact` block:

```typescript
redact: {
  paths: [
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.confirmPassword',
    'req.body.email',
    'req.headers.authorization',
    'req.headers["x-user-email"]',
  ],
  censor: '[REDACTED]',
}
```

- Apply the same config in `apps/auth-service` — the auth service handles the most sensitive payloads (passwords, tokens).
- Verify: `POST /api/v1/auth/login` → check log output does not contain the plaintext password or email.

**Key files:**
- `apps/backend/src/modules/logger/logger.module.ts` — add `redact` config
- `apps/auth-service/src/app.module.ts` — same redact config
