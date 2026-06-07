# Features — Implementation Index

All phases have been implemented. Each phase targets a specific cluster of backend engineering concepts.

---

## Phases

- **[Phase 0 — Infrastructure Foundation](./phase-0-infra.md)** ✅
  Docker multi-stage build, Nginx reverse proxy, PgBouncer connection pooling, graceful shutdown, Terminus health checks.

- **[Phase 1 — Database Deep Dive](./phase-1-database.md)** ✅
  Product variants schema (VariantType → VariantOption → ProductVariant), cursor-based pagination, PostgreSQL FTS with tsvector + GIN index, pessimistic locking (`SELECT FOR UPDATE`), expand-contract migrations.

- **[Phase 2 — Reliability Patterns](./phase-2-reliability.md)** ✅
  Idempotency interceptor (`X-Idempotency-Key`), Outbox pattern (atomic event publishing), Saga for order placement, BullMQ job queue, circuit breaker (opossum), retry with exponential backoff + jitter, dead letter queue.

- **[Phase 3 — Caching & Performance](./phase-3-caching.md)** ✅
  Cache-aside via Redis, pattern-based cache invalidation (SCAN + glob), rate limiting (`@RateLimit()` decorator, Redis sorted set + Lua sliding window), Prometheus hit/miss metrics.

- **[Phase 4 — Event-Driven Architecture](./phase-4-events.md)** ✅
  Domain events with EventEmitter2 (`order.created`, `payment.confirmed`), CQRS read model (`ProductRating` materialized aggregate), order state machine with validated transitions.

- **[Phase 5 — Observability](./phase-5-observability.md)** ✅
  Correlation IDs middleware (`X-Correlation-ID`), OpenTelemetry auto-instrumentation, Jaeger distributed tracing, Prometheus metrics endpoint, Grafana dashboards (RED + Business + DB), Pino structured logging.

- **[Phase 6 — Security Depth](./phase-6-security.md)** ✅
  RS256 JWT (asymmetric signing), Google OAuth2 with PKCE via Passport, TOTP 2FA (otplib + QR code), append-only audit log (PostgreSQL RULE blocks UPDATE/DELETE), RBAC (`UserRole`: USER / ADMIN / VENDOR).

- **[Phase 7 — Core Feature Backfill](./phase-7-features.md)** ✅
  Address management (snapshot pattern), coupon system (optimistic locking), shipping calculation, tax engine, product reviews with moderation, `ProductRating` materialized aggregate, back-in-stock alerts (fan-out), return/refund workflow (state machine), PDF invoice generation (pdfkit, background job).

- **[Phase 8 — CI/CD & Production Readiness](./phase-8-cicd.md)** ✅
  GitHub Actions pipeline (lint → migration safety → tests → Docker build → blue-green deploy), zero-downtime blue-green deploy script, migration safety check (blocks `DROP COLUMN`, `ALTER TYPE`, etc.), automated DB backups.

- **[Phase 9 — Microservices Extraction](./phase-9-microservices.md)** ✅
  Notification Service (RabbitMQ consumer, Handlebars email templates), Search Service (OpenSearch, fuzzy multi-match), Auth Service (RS256 JWT, 2FA, OAuth), API Gateway (JWT verification, HTTP proxy routing).

- **[Phase 10 — Advanced Database](./phase-10-advanced-db.md)** ✅
  `pg_stat_statements` (slow query analysis), `RequestMetric` table with range partitioning (quarterly), streaming replication read replica (`docker-compose.replica.yml`), VACUUM/bloat monitoring admin endpoints, `ReadReplicaService` for read-heavy queries.

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
