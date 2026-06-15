# Features — Implementation Index

Phases 0–11 are complete. Phases 1.1–9.1 and Phase 12 are the next layer — advanced concepts derived from system design study, mapped back onto the existing codebase.

---

## Phases

- **[Phase 0 — Infrastructure Foundation](./phase-0-infra.md)** ✅
  Docker multi-stage build, Nginx reverse proxy, PgBouncer connection pooling, graceful shutdown, Terminus health checks.

- **[Phase 1 — Database Deep Dive](./phase-1-database.md)** ✅
  Product variants schema (VariantType → VariantOption → ProductVariant), cursor-based pagination, PostgreSQL FTS with tsvector + GIN index, pessimistic locking (`SELECT FOR UPDATE`), expand-contract migrations.

- **[Phase 1.1 — Database Advanced](./phase-1.1-database-advanced.md)** 🔲
  Vertical partitioning (hot/cold column split), large table batched migration (PL/pgSQL + pg_sleep), denormalization (`categoryName` snapshot on `OrderItem`).

- **[Phase 2 — Reliability Patterns](./phase-2-reliability.md)** ✅
  Idempotency interceptor (`X-Idempotency-Key`), Outbox pattern (atomic event publishing), Saga for order placement, BullMQ job queue, circuit breaker (opossum), retry with exponential backoff + jitter, dead letter queue.

- **[Phase 3 — Caching & Performance](./phase-3-caching.md)** ✅
  Cache-aside via Redis, pattern-based cache invalidation (SCAN + glob), cache stampede prevention (SET NX mutex + double-checked locking), rate limiting (`@RateLimit()` decorator, Redis sorted set + Lua sliding window), Prometheus hit/miss metrics.

- **[Phase 3.1 — Caching Advanced](./phase-3.1-caching-advanced.md)** 🔲
  Write-through cache on mutations, Redis `maxmemory-policy allkeys-lru`, Bloom filter for non-existent IDs, Redis Pub/Sub for cross-replica L1 invalidation.

- **[Phase 4 — Event-Driven Architecture](./phase-4-events.md)** ✅
  Domain events with EventEmitter2 (`order.created`, `payment.confirmed`), CQRS read model (`ProductRating` materialized aggregate), order state machine with validated transitions.

- **[Phase 5 — Observability](./phase-5-observability.md)** ✅
  Correlation IDs middleware (`X-Correlation-ID`), OpenTelemetry auto-instrumentation, Jaeger distributed tracing, Prometheus metrics endpoint, Grafana dashboards (RED + Business + DB), Pino structured logging.

- **[Phase 5.1 — Observability Advanced](./phase-5.1-observability-advanced.md)** 🔲
  Sentry global exception filter (unhandled error capture with user context), Pino PII log redaction (`password`, `email`, `authorization` headers).

- **[Phase 6 — Security Depth](./phase-6-security.md)** ✅
  RS256 JWT (asymmetric signing), Google OAuth2 with PKCE via Passport, TOTP 2FA (otplib + QR code), append-only audit log (PostgreSQL RULE blocks UPDATE/DELETE), RBAC (`UserRole`: USER / ADMIN / VENDOR).

- **[Phase 6.1 — Security Advanced](./phase-6.1-security-advanced.md)** 🔲
  GDPR right-to-erasure endpoint (`DELETE /users/me/data` — anonymizes PII, retains orders for accounting).

- **[Phase 7 — Core Feature Backfill](./phase-7-features.md)** ✅
  Address management (snapshot pattern), coupon system (optimistic locking), shipping calculation, tax engine, product reviews with moderation, `ProductRating` materialized aggregate, back-in-stock alerts (fan-out), return/refund workflow (state machine), PDF invoice generation (pdfkit, background job).

- **[Phase 7.1 — Features Advanced](./phase-7.1-features-advanced.md)** 🔲
  Dynamic REST sorting (`?sort=field:asc`), field selection interceptor (`?fields=`), SSE order status stream, WebSocket admin real-time feed, GraphQL endpoint (code-first).

- **[Phase 8 — CI/CD & Production Readiness](./phase-8-cicd.md)** ✅
  GitHub Actions pipeline (lint → migration safety → tests → Docker build → blue-green deploy), zero-downtime blue-green deploy script, migration safety check (blocks `DROP COLUMN`, `ALTER TYPE`, etc.), automated DB backups.

- **[Phase 9 — Microservices Extraction](./phase-9-microservices.md)** ✅
  Notification Service (RabbitMQ consumer, Handlebars email templates), Search Service (OpenSearch, fuzzy multi-match), Auth Service (RS256 JWT, 2FA, OAuth), API Gateway (JWT verification, HTTP proxy routing).

- **[Phase 9.1 — Microservices Advanced](./phase-9.1-microservices-advanced.md)** 🔲
  BFF aggregation module in gateway, gRPC inter-service RPC, saga choreography (review approval flow), graceful degradation (search fallback + payment retry queue), event sourcing (order event store).

- **[Phase 10 — Advanced Database](./phase-10-advanced-db.md)** ✅
  `pg_stat_statements` (slow query analysis), `RequestMetric` table with range partitioning (quarterly), streaming replication read replica (`docker-compose.replica.yml`), VACUUM/bloat monitoring admin endpoints, `ReadReplicaService` for read-heavy queries.

- **[Phase 11 — Kubernetes Platform](./phase-11-kubernetes.md)** ✅
  Kustomize overlays (local / staging / production / multi-region), KEDA autoscaling, PodDisruptionBudgets, network policies, Istio service mesh, ArgoCD GitOps.

- **[Phase 12 — Testing Strategy](./phase-12-testing.md)** 🔲
  Pact consumer-provider contract tests (frontend ↔ backend), E2E user-journey test (register → login → cart → order).

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
- **Idempotency** → `src/common/interceptors/idempotency.interceptor.ts`
- **Outbox** → `src/modules/outbox/outbox.service.ts` + `outbox.processor.ts`
- **Circuit breaker** → `src/modules/circuit-breaker/circuit-breaker.service.ts`
- **Rate limiting** → `src/modules/rate-limit/` + `src/common/guards/rate-limit.guard.ts`
- **Correlation IDs** → `src/common/middleware/correlation-id.middleware.ts`
- **CQRS read model** → `src/modules/reviews/` (updates ProductRating on approval)
- **Audit log** → `src/modules/audit/` + `prisma/migrations/*_phase6_security`
- **RBAC** → `src/common/guards/roles.guard.ts` + `@Roles()` decorator
- **Address snapshot** → `Order.shippingAddress` (JSONB column, not FK)
- **Coupon optimistic lock** → `src/modules/coupons/coupons.service.ts`
- **GitHub Actions** → `.github/workflows/ci.yml`
- **Blue-green deploy** → `apps/backend/scripts/blue-green-deploy.sh`
- **Notification service** → `apps/notification-service/src/`
- **Search service** → `apps/search-service/src/`
- **Auth service** → `apps/auth-service/src/`
- **API Gateway** → `apps/gateway/src/main.ts`
