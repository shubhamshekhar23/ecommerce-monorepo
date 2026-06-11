# Observability Debug Scenarios

Each scenario injects a real production bug, activatable via `BUG_SCENARIO=N`. Run the load test, then investigate using the three pillars: **Grafana** (metrics), **Jaeger** (traces), **Loki** (logs).

## How to run a scenario

```bash
# 1. Set the bug
export BUG_SCENARIO=1

# 2. Restart the affected service (most bugs are in the backend)
npm run dev:backend

# 3. Run the load test
npx artillery run load-tests/scenarios/scenario-01-high-500-error-rate.yml

# 4. Investigate in the tools (see each scenario below)

# 5. Disable the bug
unset BUG_SCENARIO && npm run dev:backend
```

## Tooling URLs

- Grafana: http://localhost:3001
- Jaeger: http://localhost:16686
- Loki (via Grafana): Explore → Loki datasource
- RabbitMQ: http://localhost:15672 (guest/guest)
- Mailpit: http://localhost:8025
- PgAdmin: http://localhost:5050

---

## Scenario 1 — High 500 Error Rate
**Service:** backend | **Bug:** `products.service.ts` → `findAll()`

- Grafana: `HighErrorRate` alert fires; `ErrorRateByClass` panel shows solid 5xx band
- Loki: `{service="backend"} | json | level="error"` — dense flood, all same message
- Jaeger: Service=`ecommerce-backend`, Tags `error=true` — no DB child spans (error before DB)

**Key insight:** Error thrown before DB = no DB spans. Instant diagnosis.

---

## Scenario 2 — Slow PostgreSQL Query
**Service:** backend | **Bug:** `products.service.ts` → `runFindAll()`

- Grafana: `HighP95Latency` alert; P95/P99 for route `GET /products` climbs to 2s+
- Jaeger: Find trace for `GET /api/products` → exactly **one** long `prisma Product` child span (~2s)
- Loki: `{service="backend"} | json | duration > 2000` — every request slow

**Key insight:** One long DB span = one slow query. Distinct from N+1 (Scenario 6) which shows many short spans.

---

## Scenario 3 — PostgreSQL Connection Pool Exhaustion
**Service:** backend | **Bug:** `orders-saga.service.ts` → `execute()`

- Grafana: PgBouncer panel — `cl_waiting` counter climbs; `pgbouncer_pools_client_waiting_count > 0`
- Jaeger: HTTP spans for `POST /api/orders` start but have **no DB child spans** — hanging waiting for connection
- Loki: `{service="backend"} | json | msg =~ "Query_wait_timeout"` — timeout errors appear

**Key insight:** "DB looks down" but PgBouncer shows waiting clients = pool exhaustion, not DB failure.

---

## Scenario 4 — Redis Cache Not Working
**Service:** backend | **Bug:** `cache.service.ts` → `get()`

- Grafana: `cache_operations_total{result="miss"}` rate equals HTTP request rate (should be mostly hits)
- Jaeger: Every `GET /api/products` span has a `prisma` DB child span — no Redis span before it
- Loki: `{service="backend"} | json | msg =~ "cache_miss"` — every single request logs cache miss

**Key insight:** DB query rate = request rate means cache is entirely bypassed. Identify before blaming DB.

---

## Scenario 5 — CPU Spike
**Service:** backend | **Bug:** `products.service.ts` → `runSearch()`

- Grafana: `process_cpu_seconds_total` rate spikes; `nodejs_eventloop_lag_seconds` histogram shifts right; **other routes also slow** (shared event loop)
- Jaeger: Long `GET /api/products/search` span; time is inside service span, not DB child span
- Loki: High duration logs only on search endpoint; no errors

**Key insight:** CPU-bound work starves the event loop. All routes slow — not just search. Gap between HTTP span and DB span = service code time.

---

## Scenario 6 — N+1 Query Problem
**Service:** backend | **Bug:** `products.service.ts` → `runFindAll()`

- Jaeger: `GET /api/products` → expand trace → count child spans: should see **20+ `prisma ProductVariant.findMany`** spans (one per product on the page)
- Grafana: P95 latency elevated but not as extreme as Scenario 2 (many fast queries vs one slow one)
- Loki: No errors, just elevated duration in access logs

**Key insight:** Count child spans in Jaeger waterfall. N child spans where N = page size = classic N+1.

---

## Scenario 7 — External API Slow
**Service:** backend | **Bug:** `orders-saga.service.ts` → `execute()`

- Grafana: Route-level latency panel — `POST /orders` P99 = ~3s; `GET /products` unaffected
- Jaeger: `POST /api/orders` span → **3s gap** between span start and first DB child span
- Loki: `{service="backend"} | json | route="/api/orders"` shows high duration consistently

**Key insight:** Gap between HTTP span start and first child span = time in uninstrumented code (external API call). Isolate by route in Grafana first.

---

## Scenario 8 — Memory Leak
**Service:** backend | **Bug:** `products.service.ts` → `runFindAll()` + module-level array

- Grafana: `nodejs_heap_used_bytes` chart — watch for hockey-stick growth (normal = sawtooth GC pattern)
- Grafana: `HighMemoryUsage` alert fires when heap exceeds 400MB
- Jaeger: Requests stay fast initially, then gradually slow as GC pressure mounts — correlate with heap chart timing

**Key insight:** Heap that never returns to baseline between GC cycles = leak. Correlate heap growth start time with traffic start time.

---

## Scenario 9 — Per-User Failure
**Service:** backend | **Bug:** `orders.service.ts` → `create()`

- Grafana: Error rate ~20% (not 100%) — partial failure is the key signal
- Loki: `{service="backend"} | json | level="error"` → look at `userId` field — same users fail every time
- Jaeger: Filter `error=true` → group traces by `userId` tag → affected users 100% fail, others 0%

**Key insight:** Partial error rate = per-user or per-input bug. traceId/userId correlation in Loki is the fast path.

---

## Scenario 10 — PostgreSQL Locks / Long-Running Transactions
**Service:** backend | **Bug:** `orders-saga.service.ts` → `acquireVariantLocks()`

- Grafana: Order creation latency spikes **under concurrent load** but is fine for single requests
- Jaeger: Multiple `POST /api/orders` spans — they execute sequentially (each waits for previous to finish), not in parallel
- Loki: Lock-wait timeout errors when patience runs out: `{service="backend"} | json | msg =~ "timeout"`

**Key insight:** Locks are invisible without concurrent load. Jaeger timeline view showing sequential execution = row lock contention.

---

## Scenario 11 — Random Timeout / High p99
**Service:** backend | **Bug:** `products.service.ts` → `runFindAll()`

- Grafana: `HighP99Latency` alert; **P50 = ~100ms, P99 = ~5s** — the gap between percentiles is the smoking gun
- Jaeger: Most spans fast (~100ms); ~10% are 5s with no extra child spans (delay is in service code, not DB)
- Loki: `{service="backend"} | json | duration > 4000` — affected requests show no pattern in headers/params

**Key insight:** No pattern in the slow requests = random/intermittent. No extra DB spans = the delay is in application code, not infrastructure.

---

## Scenario 12 — Background Job Failure
**Service:** backend | **Bug:** `cart-recovery.processor.ts` → `process()`

- Redis: `redis-cli LLEN bull:cart-recovery:failed` — count grows; completed count stays 0
- Loki: `{service="backend"} | json | logger="CartRecoveryProcessor"` → repeated error logs with same job IDs
- Jaeger: No notification spans complete; processor spans end with `error=true`

**Key insight:** Background job failures are completely silent to end users. Only visible via queue metrics and processor-specific log queries.

---

## Scenario 13 — Third-Party Payment Failures
**Service:** backend | **Bug:** `stripe.service.ts` → `createPaymentIntent()`

- Grafana: `payment_events_total{status="failed"}` counter climbing; `payment_success_rate_percent` drops to 0
- Grafana: `PaymentFailureSpike` alert fires (>0.1 failures/sec threshold)
- Jaeger: `POST /api/orders` spans → fail at the Stripe child span after ~2s; error message = "Stripe API timeout"
- Loki: `{service="backend"} | json | msg =~ "Stripe"` → consistent timeout errors

**Key insight:** Business metric alerts (payment failure rate) catch this before users report it. Jaeger shows exactly which span failed and at what latency.

---

## Scenario 14 — Queue Backlog (RabbitMQ)
**Service:** notification-service | **Bug:** `order.consumer.ts` → `handleOrderPlaced()`

- RabbitMQ UI (http://localhost:15672): `order` exchange → queue depth growing; `messages_ready` counter climbing
- Loki: `{service="notification-service"} | json` → messages processed but with large time gaps between them
- Jaeger: Order creation spans complete quickly; notification consumer spans start much later (queue wait time visible)

**Key insight:** Queue backlog is only visible in the message broker — not in the producing service's traces or metrics.

---

## Scenario 15 — Missing Database Index
**Service:** backend | **Bug:** `orders.service.ts` → `listAllOrders()`

- Jaeger: `GET /api/orders` → one long `prisma Order` child span (like Scenario 2 but for orders route)
- PgAdmin (http://localhost:5050): Run `EXPLAIN ANALYZE SELECT * FROM "Order" WHERE notes ILIKE '%urgent%'` → shows `Seq Scan`
- Grafana: P95 elevated for `GET /orders` route specifically; other routes unaffected

**Key insight:** Jaeger shows the symptom (slow DB span). `EXPLAIN ANALYZE` in PgAdmin shows the cause (`Seq Scan` vs `Index Scan`).

---

## Scenario 16 — Excessive Retries / Cascading Failures
**Service:** backend | **Bug:** `circuit-breaker.service.ts` → `onModuleInit()`

- Grafana: `payment_events_total{status="failed"}` rate is **3-5x** the HTTP request rate (retries counted separately)
- Loki: `{service="backend"} | json | msg =~ "retry"` → each user request generates multiple retry log entries
- Jaeger: Single `POST /api/orders` HTTP span → multiple Stripe child spans (retries), all failing

**Key insight:** Failure rate > request rate = retries. Circuit breaker that never opens amplifies failures. Count child spans in trace to see retry count.

**NOTE:** Also activate Scenario 13 (`BUG_SCENARIO=13`) for maximum effect — S16 amplifies payment failures.

---

## Scenario 17 — Cache Stampede
**Service:** backend | **Bug:** `cache.service.ts` → `getOrSet()`

- Before running: flush cache with `redis-cli DEL $(redis-cli KEYS 'products:*')`
- Jaeger: Immediately after flush, many **parallel** `prisma Product.findMany` spans appear for the same cache key (not serialized)
- Grafana: Brief DB query rate spike then drops as cache warms — spike is short-lived
- Prometheus: `cache_operations_total{result="miss"}` shows a burst of misses simultaneously

**Key insight:** Stampede = burst of parallel DB calls for the same key. With protection, only one goes through. Without it, all N concurrent requests hit DB.

---

## Scenario 18 — Deadlock
**Service:** backend | **Bug:** `orders-saga.service.ts` → `acquireVariantLocks()`

- Loki: `{service="backend"} | json | msg =~ "deadlock"` — PostgreSQL deadlock detected messages
- Jaeger: Some `POST /api/orders` spans have `error=true` with deadlock error text; adjacent spans show retry then success
- Grafana: Brief error rate spike then recovery (PostgreSQL auto-resolves deadlocks by killing one waiter)

**Key insight:** Deadlocks self-resolve but cause user-facing errors. The fix (deterministic lock ordering) is not obvious without understanding the root cause.

---

## Scenario 19 — High 4xx Error Rate
**Service:** backend | **Bug:** `products.controller.ts` → `findAll()`

- Grafana: `ErrorRateByClass` panel shows **4xx band** (not 5xx) — this is the key distinction from Scenario 1
- Loki: **`level=error` query returns nothing** — 400s are not application errors; query by status code instead: `{service="backend"} | json | status=400`
- Jaeger: Spans complete normally (service healthy) but with 400 HTTP status

**Key insight:** 4xx ≠ app crash. Logs won't show `level=error` for client errors — you need access log queries by status code in Loki.

---

## Scenario 20 — Connection Leak
**Service:** backend | **Bug:** `products.service.ts` → `runFindAll()`

- Grafana: `process_open_fds` (open file descriptors) climbs **linearly** proportional to request count
- Grafana: `nodejs_active_handles_total` grows over time
- Eventually: `{service="backend"} | json | msg =~ "connection"` in Loki → PostgreSQL max_connections exhausted

**Key insight:** FD count rising linearly with traffic = connection leak. Slow-burn scenario — needs 10+ min at low RPS to exhaust connections.

---

## Scenario 21 — Silent Business Transaction Failure
**Service:** backend | **Bug:** `outbox.service.ts` → `publishToRabbitMQ()`

- Backend: orders return `201 Created` — no errors visible anywhere in Grafana
- Jaeger: Order span completes OK; find the outbox processor trace → **no RabbitMQ publish child span**
- Loki: `{service="backend"} | json | msg =~ "order created"` exists; but `{service="backend"} | json | msg =~ "Published order.placed"` returns **nothing**
- RabbitMQ UI: queue message count stays at 0
- Mailpit (http://localhost:8025): no emails received

**Key insight:** Silent failures require correlating **absence** of expected events across multiple tools. No single tool shows the full picture — this is the hardest production bug class.
