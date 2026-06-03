# Phase 5 — Observability

**Status:** ✅ Done
**Concept cluster:** You cannot fix what you cannot see. Every on-call engineer lives here.

---

## What Was Built

### Correlation IDs

`src/common/middleware/correlation-id.middleware.ts`

Every inbound request gets a `X-Correlation-ID` header:
- If the client sends one, it's used as-is (allows frontend to correlate browser errors with backend logs)
- If not, one is generated (UUID v4)

The ID is attached to the Pino logger as a child context so every log line from that request — including logs from deep inside services, DB query logs, and BullMQ job logs — carries the same ID.

When a production incident occurs, you search `X-Correlation-ID: <value>` in your log aggregator and see the full story of that request in chronological order across all log levels.

### OpenTelemetry Auto-Instrumentation

`apps/backend/src/main.ts` (tracing setup imported before NestJS bootstraps)

OpenTelemetry's auto-instrumentation hooks into:
- NestJS HTTP handler execution
- Prisma queries (via `@opentelemetry/instrumentation-prisma`)
- Redis calls
- BullMQ job processing
- Outgoing HTTP requests

Every span captures: service name, operation name, duration, HTTP status code, DB query text, parent span ID.

Traces are exported via OTLP to Jaeger at `http://jaeger:4318/v1/traces`.

### Jaeger Distributed Tracing

Jaeger UI at `http://localhost:16686`.

A trace for `POST /orders` looks like:

```
POST /orders (450ms)
  └── OrdersService.create (400ms)
        ├── SELECT FOR UPDATE on ProductVariant (80ms)
        ├── Prisma: INSERT order (30ms)
        ├── Prisma: INSERT outbox_event (5ms)
        └── StripeService.createPaymentIntent (250ms) ← bottleneck
```

This is how senior devs find slow code in production without guessing. The waterfall view shows exactly which operation is the bottleneck.

### Prometheus Metrics

`src/modules/metrics/metrics.module.ts` exposes `GET /api/metrics` in Prometheus format.

Custom business metrics:

```typescript
// These tell you if the BUSINESS is healthy, not just if the server is alive
ordersTotal      → Counter, labels: status (created, cancelled, completed)
paymentEvents    → Counter, labels: status (succeeded, failed)
inventoryFailures → Counter — how often checkout fails due to out-of-stock
httpDuration     → Histogram — P50/P95/P99 request latency per route
```

The HTTP duration histogram is the most important: it lets you compute P95 latency per endpoint and set SLO-based alerts.

### Grafana Dashboards

Grafana at `http://localhost:3001` with 4 dashboard types:

- **RED dashboard** — Request Rate, Error Rate, Duration per endpoint
  - Is the API healthy right now? Answered in 10 seconds by looking at this board.

- **Business dashboard** — orders/hour, revenue/hour, payment success rate, cart-to-order conversion rate
  - Tells you if the business is making money, not just if the server is running.

- **Database dashboard** — query duration P95, connection pool utilisation, slow queries, Postgres cache hit rate
  - PgBouncer pool saturation is the first thing to check when latency spikes.

- **Infrastructure dashboard** — CPU, memory, disk I/O per container
  - Docker stats in a nicer UI.

### Pino Structured Logging

`src/modules/logger/logger.module.ts`

Pino writes JSON logs (not plain text) so they are machine-parseable by any log aggregator (ELK, Datadog, CloudWatch):

```json
{ "level": "info", "correlationId": "abc-123", "userId": "u-456", "method": "POST", "path": "/api/orders", "statusCode": 201, "durationMs": 312 }
```

In production: JSON format. In development: `pino-pretty` (install as devDependency) for human-readable output.

---

## The Three Pillars

- **Logs** — what happened (Pino + correlation ID)
- **Metrics** — how much / how often (Prometheus + Grafana)
- **Traces** — how long each step took (OpenTelemetry + Jaeger)

You need all three. Logs without traces: you know something failed but cannot find where in the call stack. Metrics without logs: you see error rate spike but cannot find the specific request that triggered it. Traces without metrics: you can debug one request but cannot see patterns across thousands.

---

## Alerting Rules (Prometheus → Grafana)

Configured in Grafana alert rules:

- `HighErrorRate` — HTTP 5xx rate > 1% for 5 consecutive minutes
- `HighLatency` — P95 response time > 500ms
- `PaymentFailureSpike` — failed payment events rate > 0.1/s
- `DBPoolSaturation` — PgBouncer active connections > 90% of pool size

---

## Key Files

- `src/common/middleware/correlation-id.middleware.ts`
- `src/modules/metrics/metrics.module.ts`
- `src/modules/logger/logger.module.ts`
- `apps/backend/src/main.ts` (OpenTelemetry setup)
- `docker-compose.yml` (Jaeger, Prometheus, Grafana services)
