# Architecture Notes → Ecommerce Project Gap Analysis

This doc cross-references the personal architecture notes (`programmingNotes/Architecture`) against everything built in this monorepo. It identifies what's new, what's already done, and what's worth implementing next.

---

## Already Implemented — Skip These

These patterns from the notes are live in the project:

- Layered Architecture — NestJS controller → service → Prisma
- Repository Pattern — Prisma service abstraction
- Service Layer — all NestJS services
- CQRS — ProductRating read model (Phase 4)
- API Gateway — gateway service (Phase 9)
- Strangler Fig — microservices extracted from monolith (Phase 9)
- Sidecar — Istio injects envoy proxy sidecars (Phase 11)
- Idempotency — X-Idempotency-Key dedup (Phase 2)
- Cache-Aside — Redis fallback (Phase 3)
- Write-Through Cache — product mutations (Phase 3.1)
- Retry + Exponential Backoff — BullMQ + jitter (Phase 2)
- Circuit Breaker — opossum (Phase 2)
- Rate Limiting — Redis sorted-set sliding window (Phase 3)
- Read Replica — ReadReplicaService (Phase 10)
- Database per Service — each microservice owns its DB (Phase 9)
- Optimistic Locking — coupon system (Phase 7)
- Pessimistic Locking — SELECT FOR UPDATE (Phase 1)
- Audit Log — append-only with PostgreSQL RULE (Phase 6)
- Blue-Green Deployment — GitHub Actions (Phase 8)
- Health Check — NestJS Terminus
- Graceful Shutdown — Phase 0
- Connection Pooling — PgBouncer (Phase 0)
- Event-Driven Architecture — EventEmitter2 + RabbitMQ + Kafka
- State Machine — order + return lifecycle (Phase 4, Phase 7)
- Saga Pattern — order placement (Phase 2)
- Outbox Pattern — transactional events (Phase 2)
- Pub/Sub — RabbitMQ topics
- Message Queue + Worker Queue — BullMQ (Phase 2)
- Dead Letter Queue — Phase 2
- Broker Pattern — RabbitMQ / Kafka as message broker
- SOA — the microservices architecture as a whole
- Multitier Architecture — presentation / application / data tiers
- SOLID — all five principles enforced via ESLint and coding standards

---

## Already in Phase Docs but Not Yet Built

These are planned in `docs/phases/` but not yet implemented. They'll come in future sessions:

- WebSocket / SSE real-time order status — Phase 7.2
- Inbox / Idempotent Consumer — Phase 9.2
- Negative caching, request coalescing, refresh-ahead, stale-while-revalidate — Phase 3.2
- Bloom filter for non-existent product IDs — Phase 3.1
- ETag / conditional requests — Phase 7.1
- GraphQL with DataLoader + query complexity — Phase 7.3
- BFF aggregation + gRPC inter-service RPC — Phase 9.1
- Encryption at rest AES-256-GCM — Phase 6.1
- GDPR right-to-erasure with grace period — Phase 6.2

---

## Genuinely New — Not In Any Phase Doc

These patterns appear in the architecture notes but are absent from the project's phase docs entirely. These are real gaps worth filling.

---

### Tier 1 — High Value, Directly Applicable

**1. Feature Flag Pattern**

What it is: Runtime-configurable switches that wrap behavior. Enables deploy-without-release, A/B tests, and emergency kill switches without a redeployment.

Why it fits here: New checkout flows, new payment providers, and new promo types can ship dark and turn on per-user or per-percentage. It's the difference between a scary deploy and a confident one.

How to implement:
- `feature_flags` Postgres table: `name`, `enabled`, `rollout_percentage`, `description`
- `FeatureFlagService.isEnabled(flagName, userId?)` — hashes userId for consistent bucketing
- Redis cache for lookups with 30s TTL (avoid DB hit per request)
- `@FeatureFlag('new-checkout')` guard decorator on controller endpoints

Where it touches: Any module with a new risky feature — Orders, Payments, Cart.

Senior dev lesson: Continuous deployment without feature flags is just continuous risk. Every major company (Stripe, GitHub, Netflix) runs behind flags.

---

**2. Distributed Lock Pattern (explicit Redlock service)**

What it is: Redis SETNX-based lock ensuring only one process executes a critical section across replicas.

Why it fits here: The project has `@Cron()` jobs and the `OutboxProcessor`. With 2+ backend replicas running in Kubernetes (which is already set up in Phase 11), the same cron job runs simultaneously on every replica. The outbox would publish duplicate events. This is a real production bug with the current setup.

How to implement:
- `DistributedLockService` using `ioredis` SETNX with TTL
- Release via Lua script (atomic compare-and-delete — prevents releasing another process's lock)
- `withLock(key, ttlMs, fn)` wrapper
- Wrap `OutboxProcessor.processOutbox()` and any `@Cron()` task

Where it touches: `OutboxProcessor`, `PaymentRetryProcessor`, any scheduled job.

Senior dev lesson: "It works on one machine" is not the same as "it works in production." Distributed locking is one of the first things you learn when you scale horizontally.

---

**3. Rule-Based Architecture for Promotions / Discounts**

What it is: Business rules externalized to a DB table and evaluated by a rules engine at runtime — rules change without a deployment.

Why it fits here: Current discount logic is hardcoded conditionals in `CouponService`. Real e-commerce has rules that multiply fast: "buy 2 get 1 free", "10% off for GOLD tier", "free shipping over $50", "first-order 15% off". Hardcoding these into the service means a deploy for every promo change.

How to implement:
- `PromotionRule` table: `id`, `name`, `condition` (JSON), `action` (JSON), `priority`, `active`
- Condition schema example: `{ "minOrderValue": 50, "customerTier": "GOLD", "productCategory": "electronics" }`
- Action schema example: `{ "type": "percentage_discount", "value": 10 }` or `{ "type": "free_shipping" }`
- `RulesEngineService.evaluate(cart, customer)` — loads active rules, evaluates in priority order, applies matching actions
- Admin endpoint to create/toggle rules without touching code

Where it touches: `CartService`, `OrdersService`, `CouponService`.

Senior dev lesson: Business logic that changes faster than your deployment cycle should live in data, not code.

---

**4. True Event Sourcing (evolve existing OrderEvent)**

What it is: State rebuilt entirely from an append-only event stream. No mutable `status` column — current state is computed by replaying events.

Current state: `OrderEvent` table exists and `OrderEventStore.append()` writes events. But `Order.status` is still a mutable column. The events are supplemental audit data, not the source of truth.

Why it fits here: The infrastructure is halfway there already. Completing the pattern means:
- Events are the only writes (no more `prisma.order.update({ status: 'PAID' })`)
- `OrderProjection` replays events to derive current state
- Wrong state? Replay and correct. Lost data? Replay from beginning.

How to implement:
- `OrderProjectionService.project(orderId)` — calls `OrderEventStore.getEvents()`, folds over them, returns derived `{ status, totalPrice, items }`
- Reads go through the projection instead of `prisma.order.findUnique`
- `Order.status` column becomes a denormalized cache (updated by the projection service after each event, for query performance)
- Add snapshot support: store projection snapshot every N events to avoid full replay on every read

Where it touches: `OrderEventStore`, `OrdersService`, `OrderSagaService`, `OrderProjection` (new).

Senior dev lesson: Event sourcing is the most auditable, debuggable, and time-travel-capable storage model. Also the most complex — you earn the complexity by solving real problems with it.

---

**5. Canary Deployment (Istio traffic splitting)**

What it is: Route X% of traffic to the new version, observe error rate / latency, gradually increase percentage, auto-promote or auto-rollback based on metrics.

Why it fits here: Blue-green is already live (Phase 8). Istio is already deployed (Phase 11). Argo CD is set up (Phase 11). Canary is the natural progression — the infrastructure is already in place, it just needs wiring.

How to implement:
- Istio `VirtualService` with weighted routes: `backend-stable` (90%) vs `backend-canary` (10%)
- Argo Rollouts `Rollout` resource replacing the `Deployment` for backend
- `CanaryAnalysis` template: pass if HTTP error rate < 1% and p99 latency < 500ms (these come from Prometheus which is already deployed)
- Auto-promote after 10 minutes of healthy metrics; auto-rollback on threshold breach

Where it touches: `k8s/base/service-mesh/`, `k8s/argocd/`, new `k8s/base/rollouts/` directory.

Senior dev lesson: Canary is how Netflix, Stripe, and Google ship. Blue-green gives you rollback. Canary gives you confidence before you're fully committed.

---

### Tier 2 — Good Learning Value

**6. Bulkhead Pattern (resource pool isolation)**

What it is: Separate connection pools / concurrency limits per dependency so one slow external service can't starve everything else.

Why it fits here: All async operations share NestJS's event loop. If Stripe API goes slow (happens frequently), all in-flight requests wait. A bounded concurrency limit on the Stripe client isolates that slowness from the product listing path.

How to implement:
- Separate `ioredis` instances for: cache reads, rate limiting, BullMQ (already somewhat separate)
- `p-limit` or worker thread pool for Stripe / external HTTP calls
- Named `HttpAgent` instances with `maxSockets` per third-party domain
- `BulkheadService` wrapping concurrency-limited execution

Where it touches: `StripeService`, `CircuitBreakerService`, Redis configuration.

---

**7. Soft Delete Pattern**

What it is: Mark records as `deletedAt: DateTime` instead of hard-deleting. The record stays in DB, invisible to normal queries, recoverable by admin.

Why it fits here: Hard-deleting a product that has active orders corrupts order history. Hard-deleting a user that has reviews orphans the review data. Soft delete prevents cascading data loss.

How to implement:
- Add `deletedAt DateTime?` to `Product`, `Category`, `User` in Prisma schema
- Prisma middleware: auto-append `WHERE "deletedAt" IS NULL` to all `findMany`/`findFirst`/`findUnique` calls
- Admin-only `DELETE /products/:id` sets `deletedAt = now()` instead of removing the row
- Separate `PURGE /products/:id` (admin-only, requires `SUPER_ADMIN` role) for genuine hard delete
- Background cron to hard-purge records soft-deleted more than 90 days ago

Where it touches: `schema.prisma`, Prisma middleware, `ProductsService`, `UsersService`.

---

**8. Fan-In Pattern (wait for multiple parallel results)**

What it is: Aggregate results from multiple parallel async operations before moving to the next step.

Why it fits here: After an order is placed, the saga currently fires notifications, inventory updates, and analytics events as fire-and-forget. With Fan-In, the saga can wait for all downstream confirmations (inventory reserved + notification queued) before marking the order CONFIRMED. This makes the saga's success condition explicit rather than optimistic.

How to implement:
- In `OrderSagaService.runOrderTransaction()`, use `Promise.allSettled([notifyWarehouse(), reserveInventory(), publishAnalytics()])` with a 5s timeout
- Log which steps failed (without failing the order) vs. which are hard requirements
- Extend `OrderEvent` with `FULFILLMENT_STARTED`, `FULFILLMENT_CONFIRMED` events

Where it touches: `OrderSagaService`, `OrderEventStore`.

---

**9. Token Bucket Rate Limiting (alongside existing sliding window)**

What it is: Tokens refill at a steady rate; each request consumes one token; short legitimate bursts allowed up to bucket capacity.

Why it fits here: The current sliding window blocks rapid-fire requests uniformly. Token bucket is better for allowing a user to add 5 cart items quickly (burst) while still preventing sustained API abuse. The two algorithms have different trade-offs — building both teaches the difference.

How to implement:
- Redis hash per user: `{ tokens: 10, lastRefill: <timestamp> }`
- Lua script (atomic): compute refill since lastRefill, cap at max, check and decrement
- Add `RATE_LIMIT_ALGORITHM=token_bucket|sliding_window` env var to switch strategies
- Compare behavior in load tests: token bucket smooths bursts, sliding window penalizes them

Where it touches: `RateLimitService` — add as a second strategy option.

---

### Tier 3 — Architectural Growth (Higher Effort)

**10. Microkernel Pattern for Payment Providers**

What it is: Minimal core payment interface + dynamically registered provider plugins. Each payment processor (Stripe, PayPal, Braintree) is a plugin implementing `IPaymentProvider`.

Why it fits here: `CircuitBreakerService` hardwires Stripe. Adding PayPal requires forking the service. The microkernel makes adding a new provider just implementing one interface and registering it.

How to implement:
- `IPaymentProvider` interface: `createPaymentIntent`, `capturePayment`, `refund`, `getProviderName`
- `PaymentPluginRegistry` maps provider names to implementations
- `StripeProvider` wraps existing Stripe logic
- `PaymentService` resolves provider from registry based on user/order preference
- Teaches: Open-Closed Principle in practice — open for new providers, closed for modification of core logic

---

**11. Pipe and Filter for Order Processing Pipeline**

What it is: Order processing as a sequential pipeline of independent, testable, reorderable steps: validate → check inventory → apply discounts → calculate tax → charge → emit events.

Why it fits here: `OrderSagaService` is currently a 200+ line class doing all of this imperatively. Each step is hard to test in isolation or reorder without risk.

How to implement:
- `OrderProcessingPipeline` with an array of `IOrderFilter` handlers
- Each filter receives `OrderContext` and returns mutated context or throws `OrderProcessingError`
- Similar to NestJS's interceptor/guard chain — each filter is independently unit-testable
- Teaches: Pipeline composition, single-responsibility at the step level, easy A/B testing of step ordering

---

**12. Interpreter Pattern — Discount Rule DSL (stretch goal)**

What it is: A small domain-specific language for expressing discount rules that non-engineers can write and edit. Rules are parsed into an AST and evaluated.

Example DSL:
```
IF order.subtotal > 100 AND customer.tier == "GOLD"
THEN apply_discount(percentage: 15)
```

Why it fits here: Natural evolution from Tier 1's Rule-Based Architecture (#3). Once you have a rules engine with JSON conditions, the next step is a human-readable expression language so business teams can manage rules without knowing JSON schema.

How to implement:
- Lexer (tokenize rule strings) → Parser (build AST) → Interpreter (evaluate AST against order context)
- Teaches: Parsing theory, AST construction, visitor pattern for AST evaluation
- Do Tier 1 (#3) first, add DSL layer as Phase 2 of that feature

---

## Patterns from Notes That Don't Apply Here

These are in the notes but not relevant for a web e-commerce monorepo:

- Sensor-Controller-Actuator — hardware/IoT domain
- Peer-to-Peer — decentralized network topology
- Blackboard — AI/expert system problem-solving
- Space-Based Architecture — tuple-space concurrency model, overkill
- Master-Slave (MapReduce style) — large-scale data pipeline use case
- Database-Centric — already moved past this style
- Reflection — already used internally by NestJS/TypeScript, no new impl needed
- Shared Nothing — concept already applied through microservices, no standalone impl

---

## Recommended Implementation Order

Ordered by value-to-effort ratio:

1. Soft Delete — low effort, prevents real data loss
2. Distributed Lock Service — medium effort, fixes a real production bug in multi-replica setup
3. Feature Flag Pattern — medium effort, high operational value
4. Bulkhead Pattern — low effort, improves Stripe/external API isolation
5. Token Bucket Rate Limiting — low effort, good algorithm comparison learning
6. Fan-In in OrderSaga — medium effort, makes saga correctness explicit
7. Rule-Based Architecture for Promotions — medium-high effort, high business value
8. True Event Sourcing evolution — high effort, deep learning value
9. Canary Deployment with Istio — medium effort, Istio already deployed
10. Microkernel for Payment Providers — high effort, architectural refactor
11. Pipe and Filter for Order Pipeline — high effort, refactor of OrderSagaService
12. Interpreter/DSL for discount rules — high effort, stretch goal after #7
