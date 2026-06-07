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

### HTTP Metrics (Request Rate, Latency, Error Rate)

`src/modules/metrics/http-metrics.interceptor.ts`

A NestJS interceptor wraps every request and records its duration into a Prometheus histogram:

```typescript
// Records: method, route pattern, status code, duration
histogram.labels('POST', '/api/orders', '201').observe(312)
```

The critical detail is using `req.route.path` (the NestJS route pattern) instead of `req.url`:

```
req.url   → /api/products/550e8400-e29b-41d4-a716-446655440000  ← bad: one series per product
req.route → /api/products/:id                                    ← good: one series per route
```

Using the raw URL creates one Prometheus time series per entity ID. A 50k-product catalog would create 50k time series and OOM Prometheus within hours. Route patterns keep cardinality bounded.

**PromQL queries this unlocks:**

```promql
# Request rate (req/sec) per route
rate(http_request_duration_ms_count[5m])

# P95 latency per route
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

# Error rate (% of 5xx responses)
rate(http_request_duration_ms_count{status_code=~"5.."}[5m])
/ rate(http_request_duration_ms_count[5m])
```

---

### Database Metrics (PgBouncer Pool)

`docker-compose.yml` (`pgbouncer-exporter` service), `k8s/base/infra/pgbouncer-deployment.yaml` (sidecar)

`prometheuscommunity/pgbouncer-exporter` connects to PgBouncer's internal admin database (`pgbouncer` virtual db) and exposes pool statistics. Requires `STATS_USERS` to be set on the PgBouncer container so the app user can query the admin interface.

**Key metrics exposed:**

| Metric | What it means |
|---|---|
| `pgbouncer_pools_client_active` | Connections currently executing a query |
| `pgbouncer_pools_client_waiting` | Connections queued waiting for a free server slot |
| `pgbouncer_pools_server_idle` | Server connections open but not in use |
| `pgbouncer_stats_total_requests` | Cumulative requests processed |

**The alert that matters:**

```promql
# Pool saturation: clients waiting for a slot > 0 for more than 30s
pgbouncer_pools_client_waiting > 0
```

When `client_waiting` is non-zero, your app has more concurrent DB requests than PgBouncer's `DEFAULT_POOL_SIZE` (20). Responses are queuing. Either increase the pool size or scale the app down. This is the metric that tells you PgBouncer is the bottleneck — without it you'd see slow API responses but no obvious cause.

In Kubernetes the exporter runs as a sidecar container in the same Pod as PgBouncer, connecting to `localhost:6432`.

---

### Prometheus Metrics

`src/modules/metrics/metrics.module.ts` exposes `GET /api/metrics` in Prometheus format.

Custom business metrics:

```typescript
// These tell you if the BUSINESS is healthy, not just if the server is alive
ordersTotal      → Counter, labels: status (created, cancelled, completed)
paymentEvents    → Counter, labels: status (succeeded, failed)
inventoryFailures → Counter — how often checkout fails due to out-of-stock
httpDuration     → Histogram — P50/P95/P99 request latency per route

// Cache health
cacheOperationsTotal → Counter, labels: result (hit|miss), namespace (products|read|rl)
// hit rate = hit / (hit + miss) per namespace
// a sudden drop in hit rate signals over-aggressive invalidation, a stampede, or Redis restart
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

### Loki Log Aggregation

`apps/backend/loki-config.yml`, `apps/backend/promtail-config.yml`

By default, Docker and Kubernetes write container logs to the host filesystem — they are lost when a container restarts and have no search capability. Loki + Promtail solve this:

```
Container stdout/stderr
       ↓
   Promtail (tails log files, labels by service/pod)
       ↓
   Loki (stores and indexes log streams)
       ↓
   Grafana (query logs alongside metrics in the same UI)
```

**How Promtail discovers containers:**

- **Docker Compose**: reads from the Docker socket (`/var/run/docker.sock`), discovers all containers automatically, attaches `service` and `container` labels from Docker Compose metadata.
- **Kubernetes**: runs as a DaemonSet (one Pod per node), reads `/var/log/pods/` from the host filesystem, uses the K8s API to label each log stream with `namespace`, `pod`, `container`, and `app`.

**Querying logs in Grafana** (`http://localhost:3001`):

Open Explore → select Loki datasource → run a LogQL query:

```logql
# All backend logs
{service="backend"}

# Errors only
{service="backend"} |= "error"

# A specific request by correlation ID
{service="backend"} |= "abc-123-correlation-id"

# Payment failures across all services
{app=~"backend|gateway"} |= "payment" |= "failed"
```

**The key insight:** Pino still writes JSON to stdout — nothing about the application changed. Promtail tails the same stdout that `docker compose logs` shows, parses each line, and ships it to Loki. You get searchable, persistent logs with zero application code changes.

**Log-trace correlation (what's still missing):** To click from a Jaeger span directly to the Loki log lines for that exact request, you'd add OpenTelemetry's Log Bridge API to inject `trace_id` and `span_id` into each Pino log line. That would make the three pillars fully cross-linked.

---

## The Three Pillars

| Pillar | Tool | What it answers | Storage |
|--------|------|-----------------|---------|
| **Logs** | Pino → Promtail → **Loki** | What happened, in what order | Loki (persistent, searchable) |
| **Metrics** | prom-client → Prometheus → Grafana | How much / how often | Prometheus TSDB |
| **Traces** | OpenTelemetry → **Jaeger** | How long each step took | Jaeger in-memory / Badger |

All three are visible in Grafana. Switch between dashboards (metrics), Explore with Loki datasource (logs), and the Jaeger datasource (traces) without leaving the same UI.

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
- `apps/backend/src/tracing.ts` (OpenTelemetry setup)
- `src/modules/metrics/http-metrics.interceptor.ts` (HTTP duration histogram)
- `apps/backend/loki-config.yml` (Loki single-node config)
- `apps/backend/promtail-config.yml` (Docker Compose log collection)
- `apps/backend/grafana/provisioning/datasources/loki.yml` (Grafana Loki datasource)
- `docker-compose.yml` (Jaeger, Prometheus, Grafana, Loki, Promtail services)
- `k8s/base/monitoring/loki-statefulset.yaml` (K8s Loki StatefulSet + Service)
- `k8s/base/monitoring/promtail-daemonset.yaml` (K8s Promtail DaemonSet + ClusterRole)
