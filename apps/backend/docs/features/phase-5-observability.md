# Phase 5 — Observability

**Status:** ✅ Done
**Concept cluster:** You cannot fix what you cannot see. Every on-call engineer lives here.

---

## What Was Built

### Correlation IDs

`src/common/middleware/correlation-id.middleware.ts`

Every inbound request gets a `X-Request-ID` header:
- If the client sends one, it's used as-is (allows frontend to correlate browser errors with backend logs)
- If not, one is generated (UUID v4)

The ID is stored in Node's `AsyncLocalStorage` so every function in the request's async chain can access it, and Pino adds it as a `requestId` field on every log line — including logs from deep inside services, DB query logs, and BullMQ job logs.

When a production incident occurs, you search `"requestId": "<value>"` in your log aggregator and see the full story of that request in chronological order across all log levels.

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

Traces can be viewed in two places — use whichever fits the task:

**Grafana** (`http://localhost:3001`) — the daily driver.
Jaeger is provisioned as a Grafana datasource (`grafana/provisioning/datasources/jaeger.yml`). Go to Explore → select **Jaeger** datasource to search and view traces without leaving Grafana. The key advantage: the `tracesToLogsV2` link is configured, so clicking any span shows a **Logs** button that queries Loki for log lines from that exact time window — jumping from a slow span directly to the log that explains why.

**Jaeger UI** (`http://localhost:16686`) — the specialist tool.
Use this for deeper investigation that Grafana doesn't fully replicate:
- **System Architecture tab** — live service dependency map showing which services call which
- Side-by-side trace comparison — useful when comparing a slow request to a fast one
- Advanced filtering by operation name, tags, min/max duration

In practice: Grafana is where you notice a problem (metrics spike → drill into a trace → jump to logs). Jaeger UI is where you go when you need to do serious root-cause analysis.

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

**Log-trace correlation (partially wired):** The Grafana Jaeger datasource is configured with `tracesToLogsV2` and `filterByTraceID: true` — so clicking a span will attempt to query Loki filtered by that trace ID. However, this only works if `trace_id` and `span_id` are present in the log lines themselves. Since Pino does not currently inject them, Grafana falls back to a time-window query (all backend logs within ±1 minute of the span) rather than an exact match. To complete the link, add OpenTelemetry's Log Bridge API to inject `trace_id` and `span_id` into every Pino log line — then the three pillars are fully cross-linked and you can jump from a specific span to the exact log lines for that request.

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

## Validating Locally

The observability stack is only useful if you can see it working. The load test suite generates realistic traffic so all three pillars light up at once.

### Step 1 — Start the stack

```bash
docker compose up -d
```

### Step 2 — Seed load test fixtures

The Artillery scenarios need two specific users and three products with fixed IDs. This script upserts them without touching your existing seed data:

```bash
cd apps/backend
npm run load:setup
```

### Step 3 — Run the load test

Start with the mixed traffic scenario — it simulates 150–300 concurrent virtual users across guest browsing, auth, cart, and checkout flows over ~10 minutes:

```bash
npm run load:mixed
```

Or run a shorter focused scenario first:

```bash
npm run load:guest    # public browsing only, no auth needed, ~5 minutes
npm run load:auth     # login/profile flow
npm run load:cart     # add to cart, update quantities
npm run load:orders   # list and view orders
```

### Step 4 — Observe while the test runs

Open all three in separate tabs:

**Logs — Grafana/Loki** (`http://localhost:3001`)
- Explore → Loki datasource
- Query: `{service="backend"}` for all logs
- Query: `{service="backend"} |= "error"` to filter errors only
- Query: `{service="backend"} |= "Rate limit exceeded"` to watch the rate limiter fire under load

**Metrics — Grafana dashboards** (`http://localhost:3001`)
- Open the RED dashboard — watch request rate climb, P95 latency, error rate
- Open the Database dashboard — watch PgBouncer `client_active` and `client_waiting` during the checkout phase
- If `client_waiting` goes above 0, PgBouncer pool is saturated — exactly the situation the pool is designed to prevent

**Traces — Jaeger** (`http://localhost:16686`)
- Select service `ecommerce-backend` (or `nestjs`)
- Click any `POST /api/orders` trace — you'll see the full waterfall: HTTP handler → variant lock → stock check → order insert → outbox insert → Stripe call
- The Stripe span will be the widest — that's the expected bottleneck

**RabbitMQ** (`http://localhost:15672`, guest/guest)
- Watch the `order.placed` queue fill and drain as the outbox processor publishes events

### Step 5 — Cleanup fixtures after testing

```bash
npm run load:clean
```

### What you should see

| Signal | Where | What to look for |
|--------|-------|-----------------|
| Request rate rising | Grafana RED dashboard | `rate(http_request_duration_ms_count[1m])` climbing |
| P95 latency | Grafana RED dashboard | Should stay under 500ms during sustained load |
| Cart add logs | Loki | `Item added: userId=... variantId=...` lines streaming in |
| Order creation trace | Jaeger | Stripe span ~250ms, Prisma spans ~30–80ms |
| Outbox events | RabbitMQ | `order.placed` messages flowing through the exchange |
| Pool health | Grafana Database dashboard | `client_waiting` stays at 0 under normal load |

### Known gotcha — Loki single-node ring

Loki 3.x sometimes fails to register its own ingester in the ring on first boot, causing Promtail to get 500s when pushing logs. If `{service="backend"}` returns no results, check:

```bash
docker logs ecommerce_promtail --tail 20
```

If you see `at least 1 live replicas required`, restart Loki and Promtail:

```bash
docker compose restart loki promtail
```

The fix is already applied in `loki-config.yml` (explicit `ingester.lifecycler` config), but a race on first startup can still trigger it occasionally.

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
