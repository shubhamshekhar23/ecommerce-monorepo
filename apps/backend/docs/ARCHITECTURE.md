# Architecture Overview

This document describes the current architecture of the E-Commerce platform. The system started as a modular NestJS monolith and has been incrementally extended with extracted microservices (Phase 9 pattern: Strangler Fig).

---

## System Topology

```
Internet
  │
  ▼
Nginx (:80)
  │  X-Request-ID injection, rate-limit headers, upstream keepalive
  ▼
Gateway (:3000)
  │  JWT verification (RS256), X-User-Id + X-User-Email header inject
  │
  ├─► /api/auth/**   ──► Auth Service        (:3006)
  ├─► /api/search**  ──► Search Service      (:3005)
  └─► /api/**        ──► Backend monolith    (:4000)
                               │
                    ┌──────────┼──────────────┐
                    │          │              │
               PostgreSQL   Redis        RabbitMQ
               (:5434 ext)  (:6379)       (:5672)
               (:6432 PgBouncer)            │
                                            │
                                   Notification Service
                                        (:3004)
                                   (RabbitMQ consumer,
                                    no HTTP API)

OpenSearch (:9200) ◄── Search Service indexes
Mailpit    (:1025) ◄── Notification Service sends
Jaeger     (:16686) ◄── OpenTelemetry traces
Prometheus (:9090) ◄── /api/metrics scrape + pgbouncer-exporter:9127
Grafana    (:3001) ◄── Prometheus + Loki datasources
Loki       (:3100) ◄── Promtail log shipping
Promtail           ──► tails container logs → Loki
```

---

## Technology Stack

**Backend monolith**

- NestJS 10, TypeScript (strict mode)
- Prisma ORM → PostgreSQL 16
- BullMQ → Redis 7
- EventEmitter2 (domain events, in-process)
- OpenTelemetry auto-instrumentation
- Pino structured logging
- `@nestjs/terminus` health checks

**Microservices**

- `apps/auth-service` — NestJS, Prisma, Passport, otplib
- `apps/search-service` — NestJS, OpenSearch client
- `apps/notification-service` — NestJS, `@golevelup/nestjs-rabbitmq`, Nodemailer/Handlebars
- `apps/gateway` — NestJS, `http-proxy-middleware`, `jsonwebtoken`

**Infrastructure**

- Docker + Docker Compose (self-hosted, no cloud PaaS)
- Nginx reverse proxy
- PgBouncer (transaction pooling mode)
- RabbitMQ (durable queues, dead-letter exchanges)
- OpenSearch (product search index)
- Prometheus + Grafana (metrics — HTTP histogram, business metrics, PgBouncer pool stats)
- Jaeger (distributed tracing via OTLP)
- Loki + Promtail (log aggregation)

---

## Backend Module Map

28 modules under `apps/backend/src/modules/`:

**Auth & Users**
- `auth/` — JWT strategy, login/register/refresh/logout, password reset
- `users/` — profile management (`GET /users/me`, `PATCH`)

**Product Catalog**
- `products/` — product CRUD, CSV import, FTS search, cursor pagination
- `categories/` — hierarchical categories (self-referential FK)
- `reviews/` — moderated product reviews, `ProductRating` aggregate maintenance
- `stock-alerts/` — back-in-stock subscriptions (fan-out pattern)

**Commerce**
- `cart/` — shopping cart (persistent, one per user)
- `orders/` — order creation (saga), status state machine, admin management
- `stripe/` — Stripe payment intents, webhook handler, refunds
- `coupons/` — discount codes (optimistic locking)
- `addresses/` — saved shipping addresses (snapshot pattern on checkout)
- `shipping/` — shipping cost calculation (strategy pattern)
- `tax/` — tax rules engine
- `returns/` — return/refund workflow (state machine)
- `invoices/` — PDF invoice generation (background job)

**Infrastructure**
- `prisma/` — PrismaService singleton
- `cache/` — Redis cache-aside service
- `queue/` — BullMQ queue registration
- `outbox/` — Outbox pattern processor (polls DB → publishes to RabbitMQ)
- `events/` — domain event class definitions
- `circuit-breaker/` — opossum wrapper for external calls (Stripe)
- `rate-limit/` — Redis-backed rate limiting guard + decorator
- `audit/` — append-only audit log service
- `metrics/` — Prometheus metrics endpoint
- `logger/` — Pino logger module
- `mail/` — Mailer module (templates, SMTP)
- `upload/` — File uploads (multer)
- `health/` — Terminus health controller
- `admin/` — Admin-only stats and management endpoints

---

## Database Schema (Key Models)

Full schema: `apps/backend/prisma/schema.prisma`

**Auth**
- `User` — id (UUID), email, password (bcrypt), firstName, lastName, role (USER/ADMIN/VENDOR), totpSecret, totpEnabled, emailVerified
- `RefreshToken` — token, userId FK, expiresAt, revokedAt
- `OAuthAccount` — provider (GOOGLE), providerUserId, userId FK

**Product Catalog**
- `Product` — id, name, slug, description, searchVector (generated tsvector, GIN-indexed), categoryId, vendorId (nullable, marketplace prep), isActive
- `ProductVariant` — id, productId, sku (unique), price, cost, stock, isActive
- `VariantType` — id, productId, name (e.g. "Size")
- `VariantOption` — id, variantTypeId, value (e.g. "L")
- `VariantAttributeValue` — (variantId, optionId) composite PK
- `VariantImage` — variantId, url, isMain, order
- `Category` — id, name, slug, parentId (self-referential)
- `ProductRating` — productId (PK), avgRating, reviewCount (CQRS read model)
- `ProductReview` — id, productId, userId, rating, title, body, status (PENDING/APPROVED/REJECTED)

**Commerce**
- `Cart` — userId (unique — one cart per user)
- `CartItem` — cartId, productId, variantId (nullable, expand-contract), quantity
- `Order` — id, orderNumber (unique), userId, status (PENDING/CONFIRMED/PROCESSING/SHIPPED/DELIVERED/CANCELLED/REFUNDED), shippingAddress (JSONB snapshot), subtotal, discountAmount, shippingCost, taxAmount, total, couponId, paymentIntentId, paymentStatus
- `OrderItem` — orderId, productId, quantity, price, variantAttributes (JSONB snapshot)
- `Address` — userId, line1/line2/city/state/country/postalCode, isDefault
- `Coupon` — code (unique), type (PERCENTAGE/FIXED), value, minOrderAmount, maxUses, usedCount, expiresAt
- `CouponUsage` — (couponId, userId) unique — prevents double-use
- `ReturnRequest` — orderId, userId, reason, status (PENDING/APPROVED/REJECTED/REFUNDED), refundId (Stripe)
- `StockAlert` — productId, userId, email, notified

**Reliability**
- `OutboxEvent` — aggregateId, eventType, payload (JSONB), status (PENDING/PROCESSING/PROCESSED/FAILED), attempts (max 5)
- `IdempotencyKey` — (userId, key) unique composite, statusCode, responseBody (JSONB), processedAt

**Audit & Compliance**
- `AuditLog` — userId, userEmail, userRole, action, entity, entityId, before (JSONB), after (JSONB), ipAddress, userAgent. Protected by PostgreSQL RULE (no UPDATE/DELETE allowed at DB level)

---

## Auth Flow (RS256 JWT)

```
Client
  │
  ├── POST /api/auth/register
  │     └── Auth Service creates User in Postgres
  │     └── Publishes user.registered to RabbitMQ
  │     └── Returns { accessToken (RS256), refreshToken }
  │
  └── POST /api/auth/login
        └── [optional] 2FA TOTP verification
        └── Returns { accessToken, refreshToken }

Subsequent requests:
  Client → Gateway → verifies JWT with public key → injects X-User-Id header → Backend
  Backend trusts X-User-Id (never re-verifies the JWT)
```

Access token: 15-minute expiry, RS256 signed
Refresh token: 7-day expiry, stored in DB, rotated on each use

---

## Event Flow (Outbox → RabbitMQ)

```
OrdersService.create()
  └── Prisma transaction:
        INSERT INTO orders ...
        INSERT INTO outbox_events (eventType: 'order.placed', status: 'PENDING')

OutboxProcessor (every 5s)
  └── SELECT * FROM outbox_events WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED
  └── Publish to RabbitMQ ORDERS exchange (routing key: order.placed)
  └── UPDATE status = 'PROCESSED'

RabbitMQ
  └── Routes to notification-service queue

Notification Service
  └── OrderConsumer.onOrderPlaced() → sends order confirmation email
```

---

## Request Lifecycle

```
1. Client sends: POST /api/orders
   Authorization: Bearer <jwt>
   Idempotency-Key: <uuid>

2. Nginx: injects X-Request-ID, applies rate-limit zone

3. Gateway:
   - Verifies JWT (RS256, public key)
   - Injects X-User-Id + X-User-Email headers
   - Proxies to Backend :4000

4. Backend:
   a. JwtAuthGuard: trusts X-User-Id (no token re-verification)
   b. RolesGuard: checks UserRole from JWT payload
   c. IdempotencyInterceptor: checks IdempotencyKey table
   d. CorrelationIdMiddleware: reads X-Request-ID, attaches to Pino logger
   e. OrdersController.create()
   f. OrdersService.create():
      - SELECT FOR UPDATE on ProductVariant (stock reservation)
      - Prisma transaction: INSERT order + INSERT outbox_event
      - CircuitBreakerService.callStripe() → create payment intent
   g. IdempotencyInterceptor: caches response in IdempotencyKey

5. Background:
   - OutboxProcessor publishes order.placed → RabbitMQ
   - Notification Service sends email
   - OpenTelemetry spans exported to Jaeger
```

---

## Security Layers

- **Network**: Nginx rate limiting, firewall (only 80/443 open externally)
- **Transport**: HTTPS/TLS via Nginx
- **Authentication**: RS256 JWT (15min expiry), refresh token rotation
- **Authorization**: RBAC (`@Roles()` guard) + ABAC checks in service layer
- **Input validation**: `class-validator` on all DTOs, `class-transformer` strips unknown fields
- **Audit trail**: append-only `AuditLog` table, protected by Postgres RULE
- **Idempotency**: deduplication at the API layer (prevents double-charges)
- **Circuit breaker**: fast-fail on Stripe outages
- **Rate limiting**: per-IP and per-user, Redis-backed

---

## Deployment Architecture

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full procedures.

```
Development (docker-compose.yml):
  All services in one compose file on one machine.
  NestJS runs with hot-reload (source-mounted volume).

Production (docker-compose.prod.yml):
  Same topology, separate machines possible.
  NestJS runs from built dist/ in production Docker image.
  Blue-green swap via blue-green-deploy.sh.
  CI/CD via GitHub Actions (see .github/workflows/ci.yml).
```

---

For detailed implementation notes on each feature, see [docs/features/index.md](./features/index.md).
