# Features — Implementation Index

All phases are complete. This index maps every phase to its documentation and the patterns it covers.

---

## Phases

- **[Phase 0 — Infrastructure Foundation](./phase-0-infra.md)** ✅
  Docker multi-stage build, Nginx reverse proxy, PgBouncer connection pooling, graceful shutdown, Terminus health checks.

- **[Phase 1 — Database Deep Dive](./phase-1-database.md)** ✅
  Product variants schema, cursor-based pagination, PostgreSQL FTS (tsvector + GIN), pessimistic locking (`SELECT FOR UPDATE`), expand-contract migrations.

- **[Phase 1.1 — Database Advanced](./phase-1.1-database-advanced.md)** ✅
  Vertical partitioning (hot/cold column split), batched migration with ID-range cursor, concurrent index creation, soft delete pattern (`deletedAt` + Prisma middleware + purge cron).

- **[Phase 2 — Reliability Patterns](./phase-2-reliability.md)** ✅
  Idempotency (`X-Idempotency-Key`), Outbox pattern, Saga for order placement, BullMQ, circuit breaker (opossum), exponential backoff + jitter, dead letter queue.

- **[Phase 2.1 — Resilience Patterns](./phase-2.1-resilience-patterns.md)** ✅
  Bulkhead (separate Redis instances per concern + `p-limit` concurrency cap on Stripe), Token Bucket rate limiting (Redis Lua script), Fan-In (`Promise.allSettled` with timeout in OrderSaga).

- **[Phase 3 — Caching & Performance](./phase-3-caching.md)** ✅
  Cache-aside, pattern-based invalidation (SCAN + glob), cache stampede prevention (SET NX mutex), rate limiting (Redis sorted set + Lua sliding window), Prometheus hit/miss metrics.

- **[Phase 3.1 — Caching Advanced](./phase-3.1-caching-advanced.md)** ✅
  Write-through cache, Redis `maxmemory-policy allkeys-lru`, Bloom filter for non-existent IDs, Redis Pub/Sub for cross-replica L1 invalidation.

- **[Phase 3.2 — Caching Patterns](./phase-3.2-caching-patterns.md)** ✅
  Negative caching (null sentinel TTL), request coalescing (singleflight), refresh-ahead, stale-while-revalidate, cache versioning (global version prefix).

- **[Phase 4 — Event-Driven Architecture](./phase-4-events.md)** ✅
  Domain events (EventEmitter2), CQRS read model (`ProductRating` aggregate), order state machine with validated transitions.

- **[Phase 5 — Observability](./phase-5-observability.md)** ✅
  Correlation IDs (`X-Correlation-ID`), OpenTelemetry auto-instrumentation, Jaeger distributed tracing, Prometheus metrics, Grafana dashboards (RED + Business + DB), Pino structured logging.

- **[Phase 5.1 — Observability Advanced](./phase-5.1-observability-advanced.md)** ✅
  Sentry global exception filter (configurable sampling, release tracking), Pino PII redaction (password, email, auth headers, cookies).

- **[Phase 6 — Security Depth](./phase-6-security.md)** ✅
  RS256 JWT, Google OAuth2 + PKCE, TOTP 2FA, append-only audit log (PostgreSQL RULE), RBAC (USER / ADMIN / VENDOR).

- **[Phase 6.1 — Security Advanced](./phase-6.1-security-advanced.md)** ✅
  Encryption at rest for sensitive fields (AES-256-GCM via Prisma middleware, key versioning).

- **[Phase 6.2 — Privacy & Compliance](./phase-6.2-privacy-compliance.md)** ✅
  GDPR right-to-erasure with grace period (schedule → cancel window → background anonymization job, hash-based pseudonymization).

- **[Phase 7 — Core Feature Backfill](./phase-7-features.md)** ✅
  Address management (snapshot), coupon system (optimistic locking), shipping, tax engine, reviews + moderation, back-in-stock alerts (fan-out), return/refund (state machine), PDF invoices (pdfkit + BullMQ).

- **[Phase 7.1 — API Advanced](./phase-7.1-api-advanced.md)** ✅
  Dynamic multi-field sorting (`?sort=price:asc,name:desc`), ORM-level field selection (`?fields=`), advanced filtering, ETag / conditional requests (`304 Not Modified`).

- **[Phase 7.2 — Realtime APIs](./phase-7.2-realtime.md)** ✅
  SSE order status stream (`EventSource` + Redis Pub/Sub for multi-replica), WebSocket admin feed (Socket.IO namespace, auth guard, Redis adapter).

- **[Phase 7.3 — GraphQL](./phase-7.3-graphql.md)** ✅
  GraphQL endpoint (code-first, additive alongside REST), DataLoader (N+1 prevention via batching), query complexity + depth limiting, persisted queries (APQ with Redis cache).

- **[Phase 7.4 — Business Rules Engine](./phase-7.4-business-rules.md)** ✅
  Rule-Based Architecture (DB-driven `PromotionRule` table, `RulesEngineService.evaluate()`), Interpreter/DSL (Lexer → Parser → AST → Interpreter pipeline for human-readable discount rules).

- **[Phase 8 — CI/CD & Production Readiness](./phase-8-cicd.md)** ✅
  GitHub Actions pipeline, zero-downtime blue-green deploy, migration safety check, automated DB backups.

- **[Phase 8.1 — Deployment Advanced](./phase-8.1-deployment-advanced.md)** ✅
  Canary Deployment (Argo Rollouts + Istio weighted traffic splitting + Prometheus `CanaryAnalysis`), Leader Election (long-lived Redis lease, `@Cron()` singleton coordination across replicas).

- **[Phase 9 — Microservices Extraction](./phase-9-microservices.md)** ✅
  Notification Service, Search Service (OpenSearch), Auth Service (RS256 + 2FA + OAuth), API Gateway (JWT verify + HTTP proxy).

- **[Phase 9.1 — Microservices: Communication](./phase-9.1-microservices-communication.md)** ✅
  BFF aggregation in gateway (`Promise.allSettled` fan-out), gRPC inter-service RPC with hard deadlines (proto contract, binary wire format).

- **[Phase 9.2 — Microservices: Coordination](./phase-9.2-microservices-coordination.md)** ✅
  Saga choreography for review approval flow (event-driven, no orchestrator), Inbox / Idempotent Consumer pattern (exactly-once processing via `InboxMessage` deduplication table).

- **[Phase 9.3 — Microservices: Resilience](./phase-9.3-microservices-resilience.md)** ✅
  Graceful degradation: search fallback to Postgres FTS (circuit breaker), payment retry queue (retriable vs non-retriable Stripe errors, BullMQ + exponential backoff).

- **[Phase 9.4 — Microservices: Event Architecture](./phase-9.4-event-architecture.md)** ✅
  Order event log (append-only `OrderEvent` table, replay, `GET /orders/:id/events`) coexisting with mutable `status` as materialized projection.

- **[Phase 9.5 — Advanced Architectural Patterns](./phase-9.5-architectural-patterns.md)** ✅
  True Event Sourcing (`OrderProjectionService` folds over events, `OrderSnapshot` for fast reads), Microkernel for payments (`IPaymentProvider` interface + `PaymentPluginRegistry`), Pipe and Filter order pipeline (11 named `IOrderFilter` steps replacing monolithic `OrderSagaService`).

- **[Phase 10 — Advanced Database](./phase-10-advanced-db.md)** ✅
  `pg_stat_statements`, `RequestMetric` range-partitioned table (quarterly), streaming replication read replica, VACUUM/bloat monitoring, `ReadReplicaService`.

- **[Phase 11 — Kubernetes Platform](./phase-11-kubernetes.md)** ✅
  Kustomize overlays (local / staging / production / multi-region), KEDA autoscaling, PodDisruptionBudgets, network policies, Istio service mesh, ArgoCD GitOps.

- **[Phase 12 — Testing Strategy](./phase-12-testing.md)** ✅
  Pact contract tests (consumer-driven, Pact Broker noted), E2E user-journey test (business side-effect assertions), Testcontainers (isolated per-run DB), mutation testing (Stryker).

---

## Architecture at a Glance

```
Internet
  │
  ▼
Gateway (port 3000)
  ├─ JWT verify + header inject (X-User-Id, X-User-Email)
  ├─► /api/auth/**   → Auth Service       (port 3006)
  ├─► /api/search**  → Search Service     (port 3005)
  └─► /api/**        → Backend monolith   (port 4000)

Backend monolith (28 modules)
  ├─ PostgreSQL  ← via PgBouncer (port 5434 / 6432)
  ├─ Redis       (port 6379) — cache, rate-limit, BullMQ
  ├─ RabbitMQ    (port 5672) — event bus via Outbox
  ├─ Jaeger      (port 16686) — traces
  └─ Prometheus  (port 9090) → Grafana (port 3001)

Notification Service (port 3004)
  └─ Consumes RabbitMQ → sends emails via Mailpit/SMTP

Search Service (port 3005)
  └─ Consumes RabbitMQ → indexes in OpenSearch (port 9200)
```

---

## Pattern Map

Where to find each pattern in the codebase:

- **PgBouncer pooling** → `docker-compose.yml`, `DATABASE_URL?pgbouncer=true`
- **Multi-stage Docker** → `apps/backend/Dockerfile`
- **Graceful shutdown** → `apps/backend/src/main.ts`
- **Cursor pagination** → `src/common/utils/cursor-pagination.util.ts`
- **PostgreSQL FTS** → `prisma/schema.prisma` (Product.searchVector generated column)
- **Soft delete** → `prisma/schema.prisma` (`deletedAt`), `src/modules/tasks/soft-delete-purge.service.ts`
- **Idempotency** → `src/common/interceptors/idempotency.interceptor.ts`
- **Outbox** → `src/modules/outbox/outbox.service.ts` + `outbox.processor.ts`
- **Circuit breaker** → `src/modules/circuit-breaker/circuit-breaker.service.ts`
- **Distributed lock** → `src/common/services/distributed-lock.service.ts`
- **Leader election** → `src/common/services/leader-election.service.ts`
- **Bulkhead** → `src/modules/stripe/stripe.service.ts` (p-limit), `src/app.module.ts` (named Redis providers)
- **Token bucket** → `src/modules/rate-limit/rate-limit.service.ts`
- **Rate limiting (sliding window)** → `src/modules/rate-limit/` + `src/common/guards/rate-limit.guard.ts`
- **Feature flags** → `src/modules/feature-flags/feature-flag.service.ts`
- **Correlation IDs** → `src/common/middleware/correlation-id.middleware.ts`
- **CQRS read model** → `src/modules/reviews/` (updates ProductRating on approval)
- **Audit log** → `src/modules/audit/` + `prisma/migrations/*_phase6_security`
- **RBAC** → `src/common/guards/roles.guard.ts` + `@Roles()` decorator
- **Encryption at rest** → `src/common/services/encryption.service.ts` (AES-256-GCM)
- **Address snapshot** → `Order.shippingAddress` (JSONB column, not FK)
- **Coupon optimistic lock** → `src/modules/coupons/coupons.service.ts`
- **SSE order stream** → `src/modules/orders/order-status.registry.ts`
- **WebSocket admin feed** → `src/modules/orders/orders.gateway.ts`
- **GraphQL + DataLoader** → `src/modules/products/products.resolver.ts`, `src/modules/reviews/reviews.loader.ts`
- **Promotions rules engine** → `src/modules/promotions/rules-engine.service.ts`
- **Discount rule DSL** → `src/modules/promotions/dsl/`
- **BFF aggregation** → `apps/gateway/src/bff/bff.service.ts`
- **gRPC client** → `src/modules/search/search-grpc.service.ts`
- **Inbox pattern** → `src/modules/inbox/inbox.service.ts`
- **Event sourcing projection** → `src/modules/orders/order-projection.service.ts`
- **Payment microkernel** → `src/modules/payments/registry/payment-plugin.registry.ts`
- **Order pipeline (pipe + filter)** → `src/modules/orders/pipeline/`
- **Canary deployment** → `k8s/base/rollouts/`
- **GitHub Actions** → `.github/workflows/ci.yml`
- **Blue-green deploy** → `apps/backend/scripts/blue-green-deploy.sh`
- **Notification service** → `apps/notification-service/src/`
- **Search service** → `apps/search-service/src/`
- **Auth service** → `apps/auth-service/src/`
- **API Gateway** → `apps/gateway/src/main.ts`
