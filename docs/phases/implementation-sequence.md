# Implementation Sequence — System Design Concepts (V2)

This file is the single source of truth for what to implement next in this monorepo.
35 items across 10 waves. Each item links to its phase doc for full context, approach, and key files.

**How to use this file:**
- Pick the next unchecked item
- Read the linked phase doc for the full approach and key files
- Implement, verify it works, commit
- Check the item off in this file

**Repo:** `/Users/shubhamshekhar/Repos/ecommerce-monorepo`
**Phase docs:** `docs/phases/` — read `index.md` for the full map

---

## Wave 1 — Config & Zero-Risk Quick Wins

- [x] **1. Redis `maxmemory-policy allkeys-lru`**
  → [phase-3.1-caching-advanced.md](./phase-3.1-caching-advanced.md)
  Add `--maxmemory 256mb --maxmemory-policy allkeys-lru` to redis service command in `docker-compose.yml` and k8s redis deployment args. No app code change.

- [x] **2. Pino PII log redaction**
  → [phase-5.1-observability-advanced.md](./phase-5.1-observability-advanced.md)
  Add `redact` config to `LoggerModule` in backend and auth-service. Fields: `req.body.password`, `req.body.email`, `req.headers.authorization`, `req.headers.cookie`, etc.

- [x] **3. Advanced filtering wire-up (`?minPrice`, `?maxPrice`, `?categoryId`, `?inStock`)**
  → [phase-7.1-api-advanced.md](./phase-7.1-api-advanced.md)
  The service already computes these. Add validated DTO fields to `FindProductsDto` and wire them into the `where` clause in `ProductsService.findAllCursor()`.

---

## Wave 2 — Database

- [x] **4. `categoryName` denormalization on `OrderItem`**
  → [phase-1.1-database-advanced.md](./phase-1.1-database-advanced.md)
  Add `categoryName String?` to `OrderItem` schema. Migration + backfill. Pass `product.category.name` in `OrderSagaService.createOrderItems()`.

- [x] **5. Vertical Partitioning — `ProductDetail` hot/cold split**
  → [phase-1.1-database-advanced.md](./phase-1.1-database-advanced.md)
  Move `description` and `specifications` to a new `ProductDetail` 1:1 table. Use ID-range cursor batching for data copy (not `NOT IN`). Update `findOne` to `include: { detail: true }`, listing queries omit it.
  *Apply concurrent index creation pattern to any new indexes in this migration.*

---

## Wave 3 — Cache Hardening

- [x] **6. Write-Through Cache on product mutations**
  → [phase-3.1-caching-advanced.md](./phase-3.1-caching-advanced.md)
  After `prisma.product.update()` / `create()`, call `cacheService.set(cacheKey, updatedProduct, ttl)` before returning. List/cursor keys still use invalidation.

- [x] **7. Redis Pub/Sub for cross-replica L1 cache invalidation**
  → [phase-3.1-caching-advanced.md](./phase-3.1-caching-advanced.md)
  Two ioredis instances (publisher + subscriber). On `invalidateProducts()`, publish to `products:invalidate`. Subscriber handler calls `l1Cache.clear()` on all replicas.

- [x] **8. Bloom Filter for non-existent product IDs**
  → [phase-3.1-caching-advanced.md](./phase-3.1-caching-advanced.md)
  Switch `docker-compose.yml` to `redis/redis-stack`. Add `bloomAdd`/`bloomExists` helpers to `CacheService`. Check `BF.EXISTS` in `ProductsService.findOne()` before cache/DB hit.

---

## Wave 4 — Cache Patterns

- [x] **9. Negative Caching**
  → [phase-3.2-caching-patterns.md](./phase-3.2-caching-patterns.md)
  Store `'__NULL__'` sentinel with 30s TTL when DB returns null. On cache hit of sentinel, throw `NotFoundException` immediately without hitting DB.

- [x] **10. Request Coalescing (singleflight)**
  → [phase-3.2-caching-patterns.md](./phase-3.2-caching-patterns.md)
  Add `inflight: Map<string, Promise<unknown>>` to `CacheService`. Concurrent cache misses for the same key share one in-flight DB promise instead of all hitting the DB independently.

- [x] **11. Refresh Ahead**
  → [phase-3.2-caching-patterns.md](./phase-3.2-caching-patterns.md)
  On cache hit, if `now > refreshAt` (80% of TTL elapsed), fire a background re-fetch via `setImmediate` and return the current value. Apply only to hot keys (featured products, category tree).

- [x] **12. Stale-While-Revalidate**
  → [phase-3.2-caching-patterns.md](./phase-3.2-caching-patterns.md)
  Dual-key pattern: `cache:{key}` (short TTL) + `cache:stale:{key}` (10× TTL). On short-key miss but stale-key hit, return stale and trigger background refresh.

- [x] **13. Cache Versioning**
  → [phase-3.2-caching-patterns.md](./phase-3.2-caching-patterns.md)
  Store global version in Redis (`cache:version`). Prefix all cache keys with `v{N}:`. To invalidate everything: `INCR cache:version`. Old keys expire naturally. Do this last in Wave 4 — it changes the key structure across the board.

---

## Wave 5 — REST API Improvements

- [x] **14. Dynamic multi-field sorting (`?sort=price:asc,name:desc`)**
  → [phase-7.1-api-advanced.md](./phase-7.1-api-advanced.md)
  Add `sort?: string` to `FindProductsDto` with allowlist regex. Create `parseSortParam()` util that returns `Prisma.ProductOrderByWithRelationInput[]`. Pass to `findMany({ orderBy })`.

- [x] **15. ORM-level field selection (`?fields=id,name,price`)**
  → [phase-7.1-api-advanced.md](./phase-7.1-api-advanced.md)
  Build Prisma `select` object from `fields` query param (allowlist-validated). Pass `select` to `findMany`. Unlike a response interceptor, this avoids fetching unused columns from the DB entirely.

- [x] **16. ETag / Conditional Requests**
  → [phase-7.1-api-advanced.md](./phase-7.1-api-advanced.md)
  Global `EtagInterceptor` — SHA1 hash of response body → `ETag` header. If `If-None-Match` matches, respond `304` with no body. Apply to GET requests only.

---

## Wave 6 — Observability & Security

- [x] **17. Sentry Global Exception Filter**
  → [phase-5.1-observability-advanced.md](./phase-5.1-observability-advanced.md)
  `Sentry.init()` in `tracing.ts` with configurable `SENTRY_TRACES_SAMPLE_RATE` and `APP_VERSION` (for release tracking). `SentryExceptionFilter` captures 5xx errors with user context. Register as outermost global filter.

- [ ] **18. Encryption at Rest for sensitive fields**
  → [phase-6.1-security-advanced.md](./phase-6.1-security-advanced.md)
  New `EncryptionService` (AES-256-GCM, key versioning via `{version}:{iv}:{authTag}:{data}` format). Prisma `$use` middleware encrypts on write, decrypts on read for `phone`, `taxId` columns.

- [ ] **19. GDPR right-to-erasure with grace period**
  → [phase-6.2-privacy-compliance.md](./phase-6.2-privacy-compliance.md)
  `DELETE /users/me/data` schedules erasure (7-day grace period). BullMQ processor runs anonymization: `email → erased.{sha256(userId).slice(12)}@deleted.invalid`, name → `[Deleted]`. Requires password confirmation. Logs audit event.

---

## Wave 7 — Realtime

- [ ] **20. SSE Order Status Stream**
  → [phase-7.2-realtime.md](./phase-7.2-realtime.md)
  `@Sse(':id/status-stream')` on `OrdersController` returning `Observable<MessageEvent>`. `OrderStatusRegistry` holds `Subject` per orderId. `OrderSagaService` emits on each status transition. For multi-replica: use Redis Pub/Sub instead of in-process Subject.

- [ ] **21. WebSocket Admin Real-Time Order Feed**
  → [phase-7.2-realtime.md](./phase-7.2-realtime.md)
  `@WebSocketGateway({ namespace: '/admin/orders' })`. Verify ADMIN role on connection from `handshake.auth.token`. `OrderSagaService` calls `gateway.server.emit('order:created', order)` after placement. Redis adapter for multi-replica.

---

## Wave 8 — GraphQL

- [ ] **22. GraphQL endpoint (code-first)**
  → [phase-7.3-graphql.md](./phase-7.3-graphql.md)
  Install `@nestjs/graphql`, `@apollo/server`, `graphql`. `GraphQLModule.forRoot` with `autoSchemaFile: true`. `ProductsResolver` + `OrdersResolver`. `@ObjectType()` types mirror existing DTOs. REST endpoints unchanged — GraphQL is additive.

- [ ] **23. DataLoader (N+1 prevention)**
  → [phase-7.3-graphql.md](./phase-7.3-graphql.md)
  `ReviewsLoader` batches `reviewsByProductId` calls within one event loop tick into a single `WHERE productId IN (...)` query. REQUEST-scoped so batching is per-operation.

- [ ] **24. Query Complexity + Depth Limiting**
  → [phase-7.3-graphql.md](./phase-7.3-graphql.md)
  Add `depthLimit(5)` and `createComplexityRule({ maximumComplexity: 100 })` to `GraphQLModule.forRoot validationRules`. Reject expensive queries before they reach resolvers.

- [ ] **25. Persisted Queries (APQ)**
  → [phase-7.3-graphql.md](./phase-7.3-graphql.md)
  Apollo Automatic Persisted Queries with Redis as APQ cache store. Client sends SHA256 hash; server looks up cached query. Reduces request size and enables query whitelisting in production.

---

## Wave 9 — Microservices

- [ ] **26. BFF Aggregation Module in Gateway**
  → [phase-9.1-microservices-communication.md](./phase-9.1-microservices-communication.md)
  New `BffModule` in `apps/gateway/src/bff/`. `GET /bff/product/:id` fans out to product + reviews + variants via `Promise.allSettled` (partial failure tolerant). Forward `x-user-id`/`x-user-email` headers.

- [ ] **27. gRPC Inter-Service Communication + Deadlines**
  → [phase-9.1-microservices-communication.md](./phase-9.1-microservices-communication.md)
  `proto/search.proto` defines `SearchService.IndexProduct`. search-service gets a `@GrpcMethod` handler on port 5005. Backend gets a gRPC client module. Every call sets a 2s deadline. Coexists with Kafka path.

- [ ] **28. Saga Choreography — Review Approval Flow**
  → [phase-9.2-microservices-coordination.md](./phase-9.2-microservices-coordination.md)
  `ReviewsService.approve()` publishes `review.approved` to RabbitMQ. `ProductsService` subscribes → recalculates `avgRating`. `NotificationService` subscribes → emails reviewer. `AuditService` subscribes → logs event. No orchestrator.

- [ ] **29. Inbox / Idempotent Consumer Pattern**
  → [phase-9.2-microservices-coordination.md](./phase-9.2-microservices-coordination.md)
  `InboxMessage` table (`messageId PK, processedAt`). Wrap every `@RabbitSubscribe` handler: check `isProcessed(messageId)` before handling, call `markProcessed(messageId)` after. Prevents double-processing on RabbitMQ redelivery. Implement immediately after item 28.

- [ ] **30. Graceful Degradation — Search Fallback**
  → [phase-9.3-microservices-resilience.md](./phase-9.3-microservices-resilience.md)
  Wrap search-service HTTP call in try/catch. On failure, fall back to `prisma.product.findMany({ where: { name: { contains: q } } })`. Wire existing `CircuitBreakerService` to open after 5 consecutive failures. Set `X-Search-Source: fallback` response header.

- [ ] **31. Graceful Degradation — Payment Retry Queue**
  → [phase-9.3-microservices-resilience.md](./phase-9.3-microservices-resilience.md)
  In `StripeService`, distinguish retriable errors (network, rate limit) from non-retriable (card declined). On retriable: enqueue `payment-retry` BullMQ job (3× exponential backoff). Order stays `PENDING` during retry. On exhaustion: emit `order.payment.failed` → saga cancels and restores cart.

- [ ] **32. Order Event Log**
  → [phase-9.4-event-architecture.md](./phase-9.4-event-architecture.md)
  Add `OrderEvent` model (`id, orderId, type, payload Json, occurredAt`). `OrderEventStore` service with `append()` and `getEvents()`. Call `eventStore.append()` at every status transition in `OrderSagaService` (alongside existing `order.update`). Expose `GET /orders/:id/events`. The mutable `status` column stays as the materialized projection.

---

## Wave 10 — Testing

- [ ] **33. Testcontainers**
  → [phase-12-testing.md](./phase-12-testing.md)
  `global-setup.ts` spins up a fresh `PostgreSqlContainer`, sets `process.env.DATABASE_URL`, runs `prisma migrate deploy`. `global-teardown.ts` stops the container. Register in `jest-e2e.json`. Do this first so items 34–35 use isolated containers.

- [ ] **34. E2E User Journey Test**
  → [phase-12-testing.md](./phase-12-testing.md)
  Expand `test/app.e2e-spec.ts`: register → login → `GET /products` → add to cart → `POST /orders`. Assert HTTP responses AND business side effects (order row in DB, stock decremented, audit log written). Use Testcontainers DB from item 33.

- [ ] **35. Pact Consumer-Provider Contract Tests**
  → [phase-12-testing.md](./phase-12-testing.md)
  Consumer (`apps/frontend`): `PactV3` defines expected `GET /api/v1/products` response shape → generates `pacts/frontend-backend.json`. Provider (`apps/backend/test/pact/`): `Verifier` runs against the pact file. Commit pact file. Add to CI: consumer → provider verification.

- [ ] **36. Mutation Testing (Stryker)**
  → [phase-12-testing.md](./phase-12-testing.md)
  `stryker.config.json` targets `orders/**` and `products/**`. Run `npx stryker run` — it mutates operators/conditions and checks if tests catch them. Add as a weekly CI schedule job (too slow for per-PR). Reveals which tests assert on nothing.

---

## Quick Reference

| # | Item | Phase Doc | Wave |
|---|------|-----------|------|
| 1 | Redis maxmemory-policy | 3.1 | 1 |
| 2 | Pino PII redaction | 5.1 | 1 |
| 3 | Advanced filtering wire-up | 7.1 | 1 |
| 4 | categoryName denormalization | 1.1 | 2 |
| 5 | Vertical Partitioning | 1.1 | 2 |
| 6 | Write-Through Cache | 3.1 | 3 |
| 7 | Redis Pub/Sub L1 invalidation | 3.1 | 3 |
| 8 | Bloom Filter | 3.1 | 3 |
| 9 | Negative Caching | 3.2 | 4 |
| 10 | Request Coalescing | 3.2 | 4 |
| 11 | Refresh Ahead | 3.2 | 4 |
| 12 | Stale-While-Revalidate | 3.2 | 4 |
| 13 | Cache Versioning | 3.2 | 4 |
| 14 | Dynamic multi-field sorting | 7.1 | 5 |
| 15 | ORM-level field selection | 7.1 | 5 |
| 16 | ETag / Conditional Requests | 7.1 | 5 |
| 17 | Sentry Exception Filter | 5.1 | 6 |
| 18 | Encryption at Rest | 6.1 | 6 |
| 19 | GDPR erasure with grace period | 6.2 | 6 |
| 20 | SSE Order Status Stream | 7.2 | 7 |
| 21 | WebSocket Admin Feed | 7.2 | 7 |
| 22 | GraphQL endpoint | 7.3 | 8 |
| 23 | DataLoader | 7.3 | 8 |
| 24 | Query Complexity + Depth Limiting | 7.3 | 8 |
| 25 | Persisted Queries (APQ) | 7.3 | 8 |
| 26 | BFF Aggregation in Gateway | 9.1 | 9 |
| 27 | gRPC + Deadlines | 9.1 | 9 |
| 28 | Saga Choreography | 9.2 | 9 |
| 29 | Inbox / Idempotent Consumer | 9.2 | 9 |
| 30 | Graceful Degradation — Search | 9.3 | 9 |
| 31 | Graceful Degradation — Payment | 9.3 | 9 |
| 32 | Order Event Log | 9.4 | 9 |
| 33 | Testcontainers | 12 | 10 |
| 34 | E2E User Journey Test | 12 | 10 |
| 35 | Pact Contract Tests | 12 | 10 |
| 36 | Mutation Testing (Stryker) | 12 | 10 |
