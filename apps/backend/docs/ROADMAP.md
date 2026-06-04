# Backend Engineering Roadmap

> This project is a deliberate learning vehicle targeting 10-year experienced backend engineer level.
> Every phase maps to a concept cluster. Build the feature, understand the pattern behind it.

---

## The 10-Year Engineer Knowledge Map

Track your progress against every concept a senior/staff backend engineer carries:

```
DATABASE                    SYSTEM DESIGN               INFRA & OPS
─────────────────────────   ─────────────────────────   ─────────────────────
✓ Index types & when        ✓ Event-driven arch         ✓ Docker multi-stage
✓ EXPLAIN ANALYZE           ✓ CQRS                      ✓ Nginx reverse proxy
✓ Query planning            □ Event Sourcing             ✓ PgBouncer pooling
□ Isolation levels          ✓ Saga pattern               ✓ CI/CD pipeline
✓ MVCC internals            ✓ Outbox pattern             ✓ Zero-downtime deploys
✓ SELECT FOR UPDATE         ✓ Idempotency                ✓ Blue-green strategy
✓ Connection pooling        ✓ Circuit Breaker            ✓ Secrets management
✓ Partitioning              ✓ Retry + jitter             ✓ Health checks
✓ Read replicas             ✓ Dead letter queues         ✓ Graceful shutdown
✓ Zero-downtime migration   ✓ Cache patterns (4 types)   ✓ Structured logging
✓ Full-text search          ✓ Rate limiting algorithms   ✓ Distributed tracing
✓ Materialized views        ✓ Distributed locks          ✓ Prometheus + Grafana
✓ Cursor pagination         ✓ Webhook reliability        ✓ Alerting rules
✓ N+1 detection             ✓ Fan-out pattern            ✓ Log correlation IDs
✓ VACUUM & bloat            ✓ Snapshot pattern           ✓ Backup + PITR
                                                         ✓ Kubernetes (K8s)
                                                         ✓ Rolling updates / HPA
                                                         ✓ Ingress + StatefulSets

SECURITY                    ARCHITECTURE                MICROSERVICES
─────────────────────────   ─────────────────────────   ─────────────────────
✓ JWT internals (RS256)     □ DDD bounded contexts      ✓ gRPC vs REST vs MQ
✓ OAuth2/OIDC + PKCE        ✓ Repository pattern        ✓ Strangler fig pattern
✓ 2FA TOTP algorithm        □ Aggregates                ✓ Service-to-service auth
✓ RBAC vs ABAC              ✓ Domain events             □ Token introspection
✓ OWASP Top 10              □ Hexagonal architecture    ✓ API Gateway pattern
✓ Audit trails              ✓ Strategy pattern          □ Service mesh concepts
✓ Row-level security        ✓ State machine pattern     □ Change data capture
□ API key auth              ✓ Rules engine pattern      ✓ Event bus vs message bus
```

**Legend:** ✓ implemented in code · □ not yet built

**Not built (honest accounting):**
- *Event Sourcing* — documented in Phase 4 as a study concept; not implemented (complexity vs benefit trade-off at this scale)
- *Isolation levels* — PgBouncer + Prisma transaction mode used throughout; explicit demo of READ COMMITTED vs SERIALIZABLE behaviours not written
- *Token introspection* — chose self-validating RS256 JWT (0ms overhead) over introspection endpoint (20ms per request); trade-off documented in Phase 9 notes
- *DDD bounded contexts / Aggregates / Hexagonal architecture* — architectural patterns applied informally; no explicit DDD modelling exercise
- *Service mesh concepts* — Envoy/Linkerd sidecar proxies not deployed; concepts documented in Phase 9
- *Change data capture* — WAL-based CDC documented in Phase 10 study notes; Debezium not wired up (Outbox pattern covers the same use case at this scale)
- *API key auth* — not a project requirement; JWT covers all authentication needs


---

## Suggested Execution Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 5 (parallel with 3)
→ Phase 4 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11
```

---

## Phase 11: Kubernetes

**~3 weeks | You currently know: Docker Compose orchestration | You'll gain: declarative cluster orchestration**

### What to Build

- `k8s/base/` — Deployments, Services, StatefulSets, HPA, Ingress, Jobs for all 5 services + infra
- `k8s/overlays/{local,staging,production}/` — Kustomize environment overlays
- Rolling updates replacing `blue-green-deploy.sh`
- Prisma migration as a K8s Job (not an initContainer)
- ConfigMaps + Secrets separation pattern
- CI/CD: replace SSH + bash deploy with `kubectl apply -k`

### Core Concepts

**Rolling updates replace the blue-green script**
`maxUnavailable: 0` + `maxSurge: 1` + readiness probe + `preStop` hook is exactly what the 130-line bash script was doing manually.

**Liveness vs readiness probes**
Liveness failure → restart. Readiness failure → remove from Service endpoints (no traffic), don't restart. The backend already separates these (`/api/health/live` vs `/api/health/ready`).

**StatefulSets for databases**
Pods get stable names (`postgres-0`), stable PVCs, and sequential startup. In production, swap them for managed services (RDS, ElastiCache) via ExternalName Services — app code connects to the same hostname.

**K8s Secrets are base64, not encrypted**
For production: Sealed Secrets (encrypted, safe to commit) or External Secrets Operator (pulls from AWS Secrets Manager / Vault).

**Kustomize overlays (not Helm)**
Plain YAML + thin overlay system. No templating language. One base, environment patches only override what differs.

### The Aha Moment

Watch a rolling deploy with `kubectl rollout status deployment/backend -n ecommerce`. Then read `apps/backend/scripts/blue-green-deploy.sh` side-by-side. Everything the bash script did manually — health polling, nginx reload, drain sleep, container stop — K8s does automatically via the control loop.

---

## Phase 0: Infrastructure Foundation

**~2 weeks | You currently know: CRUD APIs | You'll gain: the container/infra layer every senior dev runs locally**

### What to Build

- Multi-stage `Dockerfile` (separate dev and prod images — prod image is ~10x smaller, no dev dependencies)
- `docker-compose.yml` with: **Nginx + App + PostgreSQL + PgBouncer + Redis**
- Nginx config as reverse proxy with upstream keepalive and request buffering
- PgBouncer in transaction pooling mode
- NestJS graceful shutdown (drain in-flight requests before exit)
- Terminus health checks wired to Docker's `HEALTHCHECK` directive

### Core Concepts

**PgBouncer / Connection Pooling**
PostgreSQL spawns a process per connection. At high load with 100 Node.js instances × 5 Prisma pool connections = 500 real Postgres connections. Postgres degrades around 200-300. PgBouncer sits in between and multiplexes — 500 app connections share 20 real Postgres connections. Transaction mode (vs session mode) is the right choice for Prisma.

**Multi-stage Docker builds**
Stage 1 (`builder`): install all deps + compile TypeScript. Stage 2 (`runner`): copy only `dist/` and `node_modules --production`. Prod image has no TypeScript compiler, no dev tools. Smaller attack surface, faster pulls.

**Graceful shutdown**
When Docker/K8s sends `SIGTERM`, you have ~30s before `SIGKILL`. Graceful shutdown: stop accepting new requests → wait for in-flight requests → close DB connections → exit. Without it: dropped requests on every deploy.

### The Aha Moment

Run `docker stats` while load testing. Watch Postgres connections with `SELECT count(*) FROM pg_stat_activity`. With PgBouncer: stays flat at ~20. Without: spikes to 500+ and eventually errors.

---

## Phase 1: Database Deep Dive

**~4 weeks | The most important phase. DB knowledge separates junior from senior.**

### What to Build

**Schema Redesign: Product Variants** _(do this before any other feature)_

```
Product (parent — searchable, displayable)
  ├── VariantType: "Size", "Color"
  │     └── VariantOption: "S", "M", "L" / "Red", "Blue"
  └── ProductVariant (the actual sellable unit — has price, stock, SKU, images)
        └── VariantAttributeValue: variantId → optionId (Size=L, Color=Red)
```

Cart items and order items reference `ProductVariant.id`. Order item snapshots `variantAttributes` as JSON — never FK, because a variant may be deleted but the order must remember what was purchased.

**Cursor-based pagination**
Replace `skip: page * limit` with `WHERE id > $cursor ORDER BY id LIMIT $limit`. Run `EXPLAIN ANALYZE` on both at `skip: 50000`. Offset forces Postgres to count and discard 50,000 rows. Cursor jumps directly via the index. This is the single most common pagination mistake in production.

**Full-text search with PostgreSQL FTS**

```sql
ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX products_search_idx ON products USING GIN(search_vector);

-- Query:
WHERE search_vector @@ plainto_tsquery('english', $term)
ORDER BY ts_rank(search_vector, plainto_tsquery('english', $term)) DESC
```

No external dependency — ships inside Postgres.

**Pessimistic locking for inventory**

```sql
-- Inside a transaction:
SELECT * FROM product_variants WHERE id = $id FOR UPDATE;
UPDATE product_variants SET stock = stock - $qty WHERE id = $id AND stock >= $qty;
```

Write a test that fires 10 concurrent requests for the last unit. Without `FOR UPDATE`: all 10 succeed (oversell). With it: exactly 1 succeeds.

**Zero-downtime migration strategy (expand-contract)**
Never rename a column in one step.
1. **Expand**: add new column (nullable), deploy code that writes to both
2. **Backfill**: migrate data from old to new
3. **Contract**: make new column required, remove old column

### Core Concepts

- **B-tree index**: default, great for equality and range (`WHERE price > 50`)
- **GIN index**: for arrays, JSONB, full-text search (`WHERE tags @> '{electronics}'`)
- **Partial index**: `CREATE INDEX ON products(name) WHERE is_active = true` — only indexes active rows, fraction of the size
- **MVCC**: PostgreSQL never overwrites rows in place. An UPDATE writes a new row version, marks the old one dead. Multiple transactions read different versions without blocking each other. VACUUM reclaims dead row space.
- **Isolation levels**: Write a demo showing the difference between READ COMMITTED, REPEATABLE READ, and SERIALIZABLE. Trigger a phantom read. Trigger a serialization failure. Actually see the behaviours.
- **N+1 detection**: Set `DEBUG=prisma:query`. Load order list with items. Count queries. Fix with `include`. Understand what SQL Prisma generates for each `include` depth.

---

## Phase 2: Reliability Patterns

**~5 weeks | What makes systems stay up at 3am. The hardest conceptual phase.**

### What to Build

**Idempotency Key Middleware**
Client generates a UUID, sends it as `Idempotency-Key: <uuid>` header. Server stores `{key → response}` in Redis (TTL 24h). On duplicate request: return cached response immediately. Why it matters: user clicks "Place Order" twice due to network lag. Without this: two orders. With this: second request returns the first response.

Implement as a NestJS interceptor, not inline in each controller.

**The Outbox Pattern** _(most important pattern in this phase)_

Problem: you create an order in Postgres, then publish `OrderCreated` to an event bus. If the event bus is down — you have an order but no event. Inventory never updated, email never sent.

Fix: write the event to an `outbox` table **in the same DB transaction** as the order. A separate poller publishes unpublished events. Even if the poller crashes, it retries.

```
Transaction:
  INSERT INTO orders ...
  INSERT INTO outbox (payload, status='PENDING') ...

Outbox worker (every 1s):
  SELECT * FROM outbox WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED
  → publish event
  → UPDATE outbox SET status = 'PUBLISHED'
```

`SKIP LOCKED` lets multiple workers run without stepping on each other.

**Saga Pattern for Order Placement** _(orchestration style)_

```
Step 1: ReserveInventory       → compensate: ReleaseInventory
Step 2: CreateOrder            → compensate: CancelOrder
Step 3: ChargePayment (Stripe) → compensate: RefundPayment
Step 4: ConfirmOrder           → (terminal, no compensation)

If Step 3 fails → run Step 2 compensation → run Step 1 compensation
```

Implement as a state machine in a BullMQ job. This is how every real ecommerce handles checkout atomicity across multiple systems.

**BullMQ Internals** _(study while using)_

BullMQ is built on Redis data structures:
- Pending jobs → Redis List (`LPUSH` / `BRPOP`)
- Delayed jobs → Redis Sorted Set (score = `execute_at` timestamp)
- Active jobs → Redis Hash (job being processed)
- Failed jobs → Redis Sorted Set (dead letter queue)

When you call `queue.add('email', payload, { delay: 3600000 })` you are doing a `ZADD` with score = now + 1hr. The worker does `ZRANGEBYSCORE 0 now` every second.

**Retry with Exponential Backoff + Jitter**

```typescript
const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
const jitter = delay * Math.random() * 0.3; // ±30%
const actualDelay = delay + jitter;
```

Why jitter? If 1000 jobs all fail at once and retry at exactly the same interval — they hammer the downstream service simultaneously (thundering herd). Jitter spreads them out across the retry window.

**Stripe Webhook Deduplication**

```sql
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,  -- Stripe's event ID
  type TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- On each webhook:
INSERT INTO stripe_events (id, type) ON CONFLICT (id) DO NOTHING;
-- If 0 rows affected → already processed, return 200 immediately
```

Stripe retries webhooks for 72 hours. Without deduplication, an order could be confirmed multiple times.

**Circuit Breaker for External Calls**
After N failures in a window, "open" the circuit — fail immediately for a cooldown period, then try one "probe" request. If it succeeds, close the circuit. Use `cockatiel` or `opossum`. Study the state machine: `Closed → Open → Half-Open → Closed`.

### Core Concepts

- **Exactly-once delivery is impossible** in distributed systems. Choose between at-least-once (duplicates possible, use idempotency) or at-most-once (events may be lost). Production systems use at-least-once + idempotency.
- **Why the Outbox pattern exists**: solves the dual-write problem. You cannot atomically write to a DB and a message broker without a distributed transaction. The Outbox piggybacks on the DB transaction.
- **Choreography vs Orchestration Saga**: Choreography — services react to events, no central coordinator (hard to debug). Orchestration — one saga orchestrator directs each step (easier to reason about, easier to compensate). For checkout, use orchestration.
- **SKIP LOCKED**: PostgreSQL feature that lets multiple workers pull from a queue table without blocking each other. The basis for Postgres-as-a-job-queue pattern.

---

## Phase 3: Caching & Performance

**~3 weeks | Every senior dev has been burned by a cache bug. Learn the patterns correctly.**

### What to Build

**Cache-Aside (Lazy Loading)**

```
GET /products/:slug
  → Check Redis: products:slug:{slug}
  → Hit: return cached
  → Miss: query Postgres, store in Redis (TTL 5min), return result

PUT /products/:id
  → Update Postgres
  → DEL Redis key   ← cache invalidation
```

**Tag-Based Cache Invalidation for Category Tree**
Cache the category tree for 30min. When a category is updated, invalidate all cache keys tagged with that category. Implement with Redis Sets: each tag maps to a Set of cache keys. Delete by tag on mutation.

**Token Bucket Rate Limiting — implement manually first**

```typescript
// Redis: user:{id}:tokens = current token count
// Refill: 10 tokens/second, max bucket: 100
// Each request costs 1 token

const tokens = await redis.get(`user:${id}:tokens`);
if (tokens < 1) throw new TooManyRequestsException();
await redis.decrby(`user:${id}:tokens`, 1);
```

Then switch to NestJS Throttler with Redis store and read its source. You'll recognise the same logic.

**Cache Stampede Prevention**
When a popular product's cache expires, 1000 concurrent requests hit Postgres simultaneously. Prevention: use a Redis lock (`SET NX PX`) — the first miss acquires the lock, fetches from DB, sets the cache, releases the lock. Other misses wait for the lock, then get a cache hit.

**Redis Data Structures for Business Logic**

```typescript
// Sorted Set for bestsellers — ZINCRBY on every purchase, ZREVRANGE for top N
await redis.zincrby('bestsellers:weekly', 1, `product:${id}`);
const top10 = await redis.zrevrange('bestsellers:weekly', 0, 9);

// Sorted Set for recently viewed — score = timestamp, cap at 20
await redis.zadd(`user:${userId}:viewed`, Date.now(), `product:${id}`);
await redis.zremrangebyrank(`user:${userId}:viewed`, 0, -21);

// HyperLogLog for unique product views — O(1), ~12KB regardless of set size
await redis.pfadd(`views:product:${id}`, userId);
const uniqueViews = await redis.pfcount(`views:product:${id}`);
```

### Core Concepts

- **4 cache patterns**: Cache-aside (you manage fetch and invalidation), Read-through (cache fetches on miss), Write-through (write to cache + DB simultaneously), Write-behind (write to cache, async flush to DB). Each has different consistency trade-offs.
- **Cache invalidation is the hard part**: TTL is simple but allows stale data. Event-driven invalidation (invalidate on mutation event) is the cleanest but requires an event bus.
- **Redis eviction policies**: `allkeys-lru` (evict least-recently-used key from any key) for a cache. Never use `allkeys-lru` on a Redis instance running BullMQ — it will evict pending jobs. Run a separate Redis instance for queues with `noeviction`.
- **Cardinality in rate limiting**: token bucket is smooth but stateful. Sliding window is accurate but memory-heavy at scale. Fixed window is cheapest but allows burst at window boundary. Know the trade-off for each.

---

## Phase 4: Event-Driven Architecture

**~4 weeks | The concept that unlocks scalable, decoupled systems.**

### What to Build

**Replace direct service calls with domain events**

Before (tightly coupled):
```typescript
// OrderService directly calls MailService, InventoryService, AnalyticsService
await this.mailService.sendOrderConfirmation(order);
await this.inventoryService.decrementStock(items);
await this.analyticsService.recordSale(order);
```

After (event-driven):
```typescript
this.eventEmitter.emit('order.created', new OrderCreatedEvent(order));
// Each module subscribes independently.
// OrderService does not know or care who listens.
```

Adding a `VendorModule` that reacts to order creation costs zero changes to `OrderModule`.

**CQRS for Product Catalog**

Write model (normalised, strict): `ProductVariant` with FKs, validation, business rules.

Read model (denormalised, fast): `ProductListView` — one row per product with `variantCount`, `minPrice`, `maxPrice`, `mainImageUrl`, `avgRating` pre-computed.

The read model is updated by subscribing to `product.created`, `product.updated`, `review.approved` events. Product listing query becomes `SELECT * FROM product_list_view WHERE ...` — one fast query, no JOINs.

**Order State Machine**

```typescript
const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  ['REFUNDED'],
  CANCELLED:  [],
  REFUNDED:   [],
};

function transition(current: OrderStatus, next: OrderStatus): void {
  if (!transitions[current].includes(next)) {
    throw new BadRequestException(`Invalid transition: ${current} → ${next}`);
  }
}
```

Any transition not in this map throws. This prevents delivered orders from being cancelled by a bug.

### Core Concepts

- **Commands vs Queries vs Events**: Commands change state (`PlaceOrder`). Queries read state (`GetOrder`). Events report what happened (`OrderPlaced`). A command handler emits an event. A query handler reads a read model. They never cross.
- **Eventual consistency**: the read model is updated *after* the event fires — there is a tiny window where the write model has new data but the read model does not. Acceptable for listing pages. Not acceptable for stock checks at checkout (use the write model there).
- **Domain event vs Integration event**: Domain event — something that happened within your bounded context, synchronous, in-process. Integration event — published to external systems or other services, async, goes through a message bus. The Outbox pattern is specifically for reliably publishing integration events.
- **Event Sourcing** _(study, don't implement yet)_: instead of storing current state, store the sequence of events that produced it. `OrderCreated → ItemAdded → PaymentReceived → OrderConfirmed`. Current state = replay all events. Powerful for audit history and time-travel debugging. Complex to operate.

---

## Phase 5: Observability

**~3 weeks | You cannot fix what you cannot see. Every on-call engineer lives here.**

### What to Build

**Correlation IDs**
Middleware generates `X-Request-ID: uuid` for every request. Pass it to Pino logger as child context. Pass it in outgoing HTTP calls. Pass it in BullMQ job data. Every log line from a single user request — across HTTP, service, DB, background job — shares one ID. Search it to see the full story of any request.

**OpenTelemetry Auto-Instrumentation**
One setup file instruments NestJS HTTP, Prisma queries, Redis calls, BullMQ jobs. Every span knows: duration, status, parent span. You can see:

```
POST /orders (450ms)
  └── OrderService.create (400ms)
        ├── InventoryService.reserve (80ms)
        └── Prisma.query (250ms)   ← bottleneck
```

Add Jaeger to Docker Compose. Open the Jaeger UI. Click a trace. See the waterfall. This is how senior devs find slow code in production.

**Custom Prometheus Business Metrics**

```typescript
// These tell you if the business is healthy, not just if the server is up:
const ordersTotal = new Counter({ name: 'orders_total', labelNames: ['status'] });
const paymentSuccessRate = new Gauge({ name: 'payment_success_rate_percent' });
const cartToOrderConversionRate = new Gauge({ name: 'cart_to_order_conversion_rate' });
const inventoryReservationFailures = new Counter({ name: 'inventory_reservation_failures_total' });
```

**Grafana Dashboards** _(4 types every engineer knows)_

1. **RED** (Request Rate, Error rate, Duration) — is the API healthy right now?
2. **Business** — orders/hr, revenue/hr, cart conversion rate, payment success rate
3. **Database** — query duration, connection pool utilisation, slow queries, cache hit rate
4. **Infrastructure** — CPU, memory, disk I/O per container

**Alerting Rules**

```yaml
# Error rate > 1% for 5 minutes
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01

# P95 latency > 500ms
- alert: HighLatency
  expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 500

# Payment failure spike
- alert: PaymentFailureSpike
  expr: rate(payment_events_total{status="failed"}[5m]) > 0.1
```

### Core Concepts

- **Three pillars of observability**: Logs (what happened), Metrics (how much / how often), Traces (how long each step took). You need all three. Logs without traces: you know something failed but cannot find where. Traces without metrics: you can debug one request but cannot see patterns.
- **RED method** (Rate, Errors, Duration): the three numbers that tell you if a service is healthy. Know these for every service you own.
- **Cardinality problem in Prometheus**: adding a `userId` label creates one time series per user — potentially millions. Labels must be low-cardinality (status code, route, method — not user IDs or order IDs).
- **Percentiles vs averages**: average latency hides the tail. P95=500ms means 5% of users wait >500ms. P99=2000ms means 1% wait 2 seconds. Always report P95 and P99 in dashboards and SLAs.

---

## Phase 6: Security Depth

**~4 weeks | Security is not features bolted on. It is knowledge of what breaks.**

### What to Build

**RS256 JWT (asymmetric signing)**
Current HS256 uses a shared secret — any service that validates tokens also has the secret and could forge them. RS256: private key signs, public key verifies. Services only need the public key. Add a `GET /.well-known/jwks.json` endpoint (JWK Set) — the standard for publishing public keys so any service can autodiscover them.

**OAuth2 + PKCE (Google login)**
Implement the PKCE flow manually before using Passport.js:
1. Generate `code_verifier` (random 64 bytes), derive `code_challenge = base64url(sha256(verifier))`
2. Send user to Google with `code_challenge`
3. Google returns `authorization_code`
4. Exchange code for tokens, sending `code_verifier` so Google verifies the challenge

Why PKCE? An interceptor can steal the `authorization_code` from a redirect URI. Without PKCE they can exchange it. With PKCE they cannot — they do not have the `code_verifier` that was never transmitted over the network.

**TOTP 2FA — implement the algorithm first**

```typescript
// RFC 6238: Time-based One-Time Password — this is what Google Authenticator uses
const counter = Math.floor(Date.now() / 1000 / 30); // 30-second window
const hmac = createHmac('sha1', base32Decode(secret)).update(toBuffer(counter)).digest();
const offset = hmac[19] & 0xf;
const otp = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
```

Understand the algorithm, then use `speakeasy` or `otplib`.

**Audit Log** _(append-only)_

```typescript
// Every sensitive mutation creates an immutable log entry:
AuditLog: {
  id, timestamp, userId, userEmail, userRole,
  action: 'ORDER_STATUS_CHANGED',
  entity: 'Order', entityId: '123',
  before: { status: 'PROCESSING' },
  after:  { status: 'SHIPPED' },
  ip, userAgent
}
```

Add a PostgreSQL RULE to block UPDATE and DELETE on this table. This is your defence in fraud disputes.

**Row-Level Security in PostgreSQL**

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY vendor_isolation ON products
  USING (vendor_id = current_setting('app.current_vendor_id')::uuid OR vendor_id IS NULL);
```

Even if application code has a bug and queries all products — Postgres only returns rows belonging to the current vendor. Defence in depth.

### Core Concepts

- **OWASP Top 10 in your own code**: audit for IDOR (can user A access user B's orders?), mass assignment (does `PATCH /users/me` allow setting `role=ADMIN`?), SQL injection (Prisma prevents this — understand how), insecure deserialization, broken access control.
- **RBAC vs ABAC**: RBAC (Role-Based) — "admins can update products". ABAC (Attribute-Based) — "vendors can update products where `product.vendorId = user.id`". RBAC is simple, does not scale to multi-tenancy. ABAC is flexible and composable.
- **JWT revocation problem**: JWTs are stateless — if you issue a token and then ban a user, the token is valid until expiry. Solutions: short expiry (15min) + refresh tokens (current approach — correct), or maintain a revocation list in Redis keyed by `jti` claim.

---

## Phase 7: Core Feature Backfill

**~8 weeks | Build remaining business features. Each one is a pattern exercise.**

| Feature | Pattern You Are Learning |
|---|---|
| Address management | Snapshot pattern (immutable address stored on order, not FK) |
| Coupon system | Optimistic locking, race condition prevention |
| Shipping calculation | Strategy pattern (pluggable rate calculators) |
| Tax engine | Rules engine pattern |
| Product reviews | Materialized aggregates (avg_rating updated via events) |
| Back-in-stock alerts | Fan-out pattern (1 event → N notifications) |
| Abandoned cart recovery | Delayed jobs, time-triggered workflows |
| Password reset | Secure token pattern (HMAC, single-use, TTL) |
| Refund/return workflow | State machine + compensating transactions |
| PDF invoice generation | Background job + file streaming (never block HTTP) |
| Bulk product import (CSV) | Stream processing, validation pipeline, batch DB writes |
| Vendor schema prep | Schema evolution (nullable FK now, required later) |

**Coupon system detail — the race condition:**
When 1000 users simultaneously apply the last use of a coupon (`max_uses = 1`), who wins?

```sql
UPDATE coupons
SET used_count = used_count + 1
WHERE id = $id AND used_count < max_uses
RETURNING id;
-- 0 rows returned → already at max, reject with 409
```

One atomic operation. No SELECT then UPDATE. No application-level check. This is optimistic locking.

---

## Phase 8: CI/CD & Production Readiness

**~4 weeks | How code gets to production without waking anyone up at 3am.**

### What to Build

**GitHub Actions Pipeline**

```
Push →
  [parallel] lint + type-check + unit tests →
  [sequential] build Docker image →
  migration safety check (no destructive ops) →
  integration tests (real DB + real Redis) →
  push image to registry →
  deploy (blue-green swap)
```

**Zero-Downtime Blue-Green Deploy**

```nginx
upstream app {
  server app_blue:3000;    # currently live
  # server app_green:3000; # being staged
}
```

Deploy flow: start green container → wait for health check → swap Nginx upstream → drain blue connections → stop blue. Nginx's `proxy_next_upstream` handles the cutover with zero dropped requests.

**Migration Safety in CI**
Before running migrations, parse the SQL diff. Fail if it contains:
- `DROP COLUMN` on a column still used by running code
- `ALTER COLUMN TYPE` on a non-nullable column
- `DROP TABLE`
- Any lock-acquiring operation that is not `CONCURRENTLY`

Never run migrations as the deploy step — run them before deploying new code. Old code must work with the new schema (backwards-compatible migrations first, then code, then cleanup migrations).

**Backup + Restore Drill**

```bash
# Backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore drill — do this monthly; backups you have not tested do not exist
createdb test_restore
gunzip -c backup_20260101.sql.gz | psql test_restore
```

### Core Concepts

- **Expand-contract migration**: add nullable column → deploy code writing to both → backfill → make non-nullable → remove old column. Five deploys, zero downtime.
- **Why migrations run before code**: new code expects new schema. If you deploy code first, it queries a column that does not exist yet. Run migration first — old code ignores new columns, new code uses them.
- **Docker layer caching in CI**: order Dockerfile instructions from least-changing to most-changing. `COPY package.json` + `npm ci` caches the heavy install step. `COPY . .` + `npm run build` only reruns when source changes. Wrong order = full `npm ci` on every push.

---

## Phase 9: Microservices Extraction

**~10 weeks | Extract 3 services as deliberate learning exercises. The extraction is the lesson.**

Use the **Strangler Fig** pattern: route some traffic to the new service while the monolith handles the rest. Gradually move more traffic. Never do a big-bang rewrite.

### Extraction 1: Notification Service _(easiest — pure subscriber, no shared state)_

The notification module has no state that other modules depend on. Perfect first extraction.

What you will learn:
- **gRPC vs REST for service-to-service**: gRPC uses HTTP/2 + Protocol Buffers. Strongly typed contracts, bidirectional streaming, better performance. Right for internal services. REST stays on the external API.
- **Redis Streams as a lightweight message bus** between services (vs Kafka, which adds operational overhead before you need it)
- **Service-to-service auth**: shared HMAC secret (simple for two services), mTLS (proper for many services). JWT alone is not enough — you need to know which service is calling, not just which user.

### Extraction 2: Search Service _(medium — requires data sync)_

What you will learn:
- **Elasticsearch / Meilisearch**: inverted index, sharding, relevance ranking
- **Eventual consistency in practice**: monolith writes to Postgres → Outbox → event → Search service indexes. Index lags by ~500ms. This is an acceptable trade-off for search.
- **Read Your Own Writes problem**: user creates a product, immediately searches for it, it is not in the index yet. Solution: query the monolith DB directly for very recent items (< 2s old), or maintain a "pending index" marker.
- **Strangler fig routing**: `GET /api/search` routes to the new service. Everything else stays on the monolith.

### Extraction 3: Auth Service _(hardest — every other service depends on it)_

What you will learn:
- **Token introspection endpoint**: `POST /auth/introspect {token}` → `{valid: true, userId, roles}`. Every service calls this to validate tokens. Trade-off: ~20ms added latency per request vs self-validating JWT (0ms overhead but no revocation).
- **API Gateway pattern**: gateway validates tokens once, injects `X-User-ID` and `X-User-Roles` headers. Downstream services trust the gateway, skip token validation themselves.
- **Service mesh concepts**: sidecar proxies (Envoy/Linkerd) handle mTLS, retries, circuit breaking, metrics — outside your application code. Understanding this architecture matters even if you do not implement it.

---

## Phase 10: Advanced Database

**~4 weeks | The DB knowledge that takes most engineers years to accumulate.**

### What to Build

**Table Partitioning**

```sql
CREATE TABLE orders (id, user_id, created_at, ...)
  PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_q1 PARTITION OF orders
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

Queries with `WHERE created_at > '2026-01-01'` only scan the relevant partition (partition pruning). Archiving: `DROP TABLE orders_2024` — instant, no vacuuming required.

**PostgreSQL Streaming Replication** _(Docker Compose)_
Add a replica Postgres container. Configure `primary_conninfo`. Route analytics queries (reports, dashboards) to the replica. Primary handles writes and real-time reads. Replica handles heavy aggregate queries that would otherwise slow your primary.

Monitor replication lag:
```sql
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

**Change Data Capture with Logical Replication**
Instead of polling Postgres for changes to sync to Elasticsearch, subscribe to the Postgres WAL (Write-Ahead Log). Every INSERT/UPDATE/DELETE emits an event. Use `pg_logical` or Debezium (Docker Compose). Your search index stays in sync with near-zero lag and no polling.

**pg_stat_statements Analysis**

```sql
-- Top 10 most expensive queries in total execution time
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

Find the query burning the most time. `EXPLAIN ANALYZE` it. Add an index. Measure the improvement. This is the actual workflow for production DB optimisation.

**VACUUM and Bloat**
Every UPDATE in Postgres creates a new row version (MVCC). Dead row versions accumulate. VACUUM reclaims them. Know:
- How autovacuum decides when to run
- How to check table bloat (`pgstattuple`)
- When to use `VACUUM FULL` (it locks the table — almost never in production)
- `pg_repack` — rebuilds a table without locking

---

## At the End of Phase 10

You will have personally implemented every item in the knowledge map at the top of this document. The difference between reading about the Outbox pattern and having debugged a production incident caused by not using it — that gap is what 10 years buys. This project collapses that timeline.
