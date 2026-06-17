# Implementation Sequence V2

This file picks up exactly where V1 left off. All 36 items in V1 are done.
This covers every pending item across the phase docs plus three additions surfaced
from external review — 21 items across 8 waves.

**How to use this file:**
- Pick the next unchecked item
- Read the linked phase doc for the full approach and key files
- Implement, verify it works, commit
- Check the item off here

**Repo:** `/Users/shubhamshekhar/Repos/ecommerce-monorepo`
**Phase docs:** `docs/phases/` — full design, key files, and code examples for every item

---

## Wave 1 — Quick Wins (Zero-risk, no schema changes)

No migrations, no new service dependencies, nothing that can break existing behaviour.
Do these first — ship visible improvements immediately.

- [x] **1. Dynamic multi-field sorting (`?sort=`)**
  → [phase-7.1-api-advanced.md](./phase-7.1-api-advanced.md)
  Accept `?sort=price:asc` or `?sort=createdAt:desc,name:asc` on list endpoints. Add `sort` field to `FindProductsDto` with regex validation. Create `parseSortParam()` util in `common/utils/sort.util.ts`. Pass result as Prisma `orderBy` array. Apply same pattern to `OrderQueryService`.

- [x] **2. ORM-level field selection (`?fields=`)**
  → [phase-7.1-api-advanced.md](./phase-7.1-api-advanced.md)
  Accept `?fields=id,name,price` and build a Prisma `select` object so only those columns are fetched from the DB — not stripped post-fetch. Add `fields` to `FindProductsDto`. Validate against an allowlist before building the select. Note: `select` and `include` are mutually exclusive in Prisma.

- [x] **3. ETag / conditional requests (`304 Not Modified`)**
  → [phase-7.1-api-advanced.md](./phase-7.1-api-advanced.md)
  Create `EtagInterceptor` that hashes the response body (SHA-1), sets the `ETag` header, and checks `If-None-Match` on subsequent requests — returning `304` with no body when content hasn't changed. Register as a global interceptor for GET requests only.

- [x] **4. BullMQ job dashboard (Bull Board)**
  Install `@bull-board/api`, `@bull-board/nestjs`, `@bull-board/express`. Mount the UI at `/admin/queues` behind an ADMIN-role guard. Register all existing queues: `payment-retry`, `outbox`, `data-erasure` (added in item 9). The dashboard exposes waiting / active / failed / delayed / completed counts and lets you retry or discard individual failed jobs. No new business logic — pure observability over infrastructure that already exists.

---

## Wave 2 — Database (Schema changes, run migrations carefully)

Each item involves a Prisma migration. Do these after Wave 1 since they require more care.
Items 5 and 6 are a single unit — schema first, then data migration.

- [x] **5. Concurrent index creation pattern**
  → [phase-1.1-database-advanced.md](./phase-1.1-database-advanced.md)
  Establish the pattern for all future index additions on large tables. Write a migration comment template using `CREATE INDEX CONCURRENTLY`. Add `-- @db.no-transaction` at the top of any migration that uses it — Prisma wraps migrations in transactions by default and `CONCURRENTLY` cannot run inside one. No new index to add right now; this pattern applies to item 6 and every large-table index going forward.

- [x] **6. Vertical partitioning — `ProductDetail` hot/cold split**
  → [phase-1.1-database-advanced.md](./phase-1.1-database-advanced.md)
  Move `description` and `specifications` (JSONB) from `Product` into a new `ProductDetail` 1:1 table. Listing queries (`findAllCursor`) omit the join entirely — narrower rows, more rows per 8 KB page. Detail queries (`findOne`) include it. Migration must use ID-range batched copy (item 7) before dropping the columns from `Product`.

- [x] **7. Large table migration with ID-range batching**
  → [phase-1.1-database-advanced.md](./phase-1.1-database-advanced.md)
  Write the data-copy phase of the `ProductDetail` migration using a `DO $$` PL/pgSQL block that iterates in `LIMIT 1000` chunks via `WHERE id > $last_id` cursor — not `NOT IN` (which degrades to O(n²)). Include `pg_sleep(0.05)` breathing room between batches. This is the canonical pattern for all future large-table migrations.
  *Prerequisite: item 6 — `ProductDetail` table must exist first*

---

## Wave 3 — Security & Compliance

Both items are self-contained modules. Do encryption before GDPR since the erasure
flow should also clear encrypted field values cleanly.

- [x] **8. Encryption at rest for sensitive User fields**
  → [phase-6.1-security-advanced.md](./phase-6.1-security-advanced.md)
  Create `EncryptionService` wrapping Node's `crypto.createCipheriv` / `createDecipheriv` with AES-256-GCM. Store ciphertext as `{version}:{iv}:{authTag}:{data}` in a TEXT column — the version prefix enables key rotation without a schema change. Prisma `$use` middleware intercepts writes (encrypt) and reads (decrypt) for `User.phone`, `User.dateOfBirth`, `User.taxId`. Key loaded from `process.env.DB_ENCRYPTION_KEY`. Never encrypt fields used in `WHERE` clauses — they can't be indexed.

- [x] **9. GDPR right-to-erasure (`DELETE /users/me/data`)**
  → [phase-6.2-privacy-compliance.md](./phase-6.2-privacy-compliance.md)
  Two-phase approach: (1) `DELETE /users/me/data` with password confirmation creates a `DataErasureRequest` record (`scheduledAt = now + 7 days`) and sends a confirmation email. (2) BullMQ processor runs at `scheduledAt` — anonymizes PII fields using a deterministic hash, deletes addresses and refresh tokens, logs to audit trail. Order history is preserved (financial records override erasure right). Add `DELETE /users/me/data/cancel` for the grace-period window.

---

## Wave 4 — Infrastructure (Cross-cutting, needed by later waves)

These two items are foundational. Distributed Lock is needed by any cron job running
on multiple replicas. Feature Flags are needed by any new behaviour that should ship
dark. Build both before Wave 5 so the coordination and realtime waves can use them.

- [x] **10. Distributed Lock Service (Redis Redlock)**
  Create `DistributedLockService` using `ioredis` SETNX with TTL. Release via Lua script that atomically checks ownership before deleting — prevents a slow process from releasing a lock held by a different process. Expose `withLock(key, ttlMs, fn)` wrapper. Wrap `OutboxProcessor`, `PaymentRetryProcessor`, and the `DataErasureRequest` cron job — all three currently run on every replica simultaneously in a multi-pod Kubernetes deployment. This fixes a real production bug, not a theoretical one.

- [x] **11. Feature Flag Service (Redis-backed)**
  Create `feature_flags` Postgres table: `name`, `enabled`, `rollout_percentage`, `description`, `updatedAt`. Create `FeatureFlagService.isEnabled(flagName, userId?)` — hashes `userId` against `rollout_percentage` for consistent per-user bucketing (same user always gets same result). Cache the flag lookup in Redis for 30 seconds to avoid a DB hit per request. Add a `@FeatureFlag('flag-name')` guard decorator usable on controller methods. Seed initial flags: `new-checkout-flow`, `graphql-api`, `sse-order-updates`. Admin endpoint to toggle flags without a deployment.

---

## Wave 5 — Microservices Coordination

These two items are tightly paired — implement Inbox first, then Choreography on top
of it. Choreography without Inbox means duplicate events are processed multiple times.

- [x] **12. Inbox pattern — idempotent message consumers**
  → [phase-9.2-microservices-coordination.md](./phase-9.2-microservices-coordination.md)
  Add `InboxMessage` model to `schema.prisma` (`messageId @id`, `processedAt`). Create `InboxService.isProcessed()` and `markProcessed()` — the latter uses INSERT ON CONFLICT DO NOTHING so concurrent duplicates are safe. Wrap every `@RabbitSubscribe` handler with the idempotency fence before processing. Add a scheduled cleanup job (wrapped with Distributed Lock from item 10) to purge rows older than 7 days. This completes Outbox + Inbox = exactly-once semantics end-to-end.

- [x] **13. Saga choreography — review approval flow**
  → [phase-9.2-microservices-coordination.md](./phase-9.2-microservices-coordination.md)
  Implement review moderation as a choreography saga — no central orchestrator. `ReviewsService.approve()` publishes `ReviewApprovedEvent` to RabbitMQ exchange `review.events`. Three independent subscribers react: `ProductsService` recalculates `avgRating` + `reviewCount`; `NotificationService` sends "your review is live" email; `AuditService` logs the approval. Each subscriber wraps its handler with the Inbox pattern (item 12). Define event types in `@ecommerce/shared-types`.
  *Prerequisite: item 12 — Inbox must exist before adding choreography subscribers*

---

## Wave 6 — Realtime APIs

SSE and WebSocket are independent of each other. SSE is simpler — do it first.
Both benefit from the Feature Flag (item 11) — gate behind `sse-order-updates` and
`ws-admin-feed` flags while stabilising.

- [x] **14. SSE order status stream**
  → [phase-7.2-realtime.md](./phase-7.2-realtime.md)
  Add `@Sse(':id/status-stream')` on `OrdersController`. Create `OrderStatusRegistry` — a `Map<orderId, Subject<MessageEvent>>`. When `OrderSagaService` transitions order status, emit to the Subject. For multi-replica: replace in-process Subject with Redis Pub/Sub on `order:status:{orderId}`. Set `Cache-Control: no-cache` and `X-Accel-Buffering: no` headers to prevent Nginx buffering. Update gateway proxy config to not buffer SSE connections.

- [x] **15. WebSocket admin real-time order feed**
  → [phase-7.2-realtime.md](./phase-7.2-realtime.md)
  Create `OrdersGateway` with `@WebSocketGateway({ namespace: '/admin/orders' })`. On connection, verify bearer token from `socket.handshake.auth.token` and assert `ADMIN` role — disconnect unauthorised clients immediately. In `OrderSagaService`, after order creation call `ordersGateway.server.emit('order:created', sanitizedOrder)`. For multi-replica: add `socket.io-adapter-redis` so events broadcast to all replicas regardless of which pod the admin connected to. `@nestjs/websockets` and `socket.io` are already in `package.json`.

---

## Wave 7 — Microservices Communication

BFF and gRPC are independent. BFF is the simpler change (gateway HTTP fan-out);
do it before gRPC.

- [x] **16. BFF aggregation layer in Gateway**
  → [phase-9.1-microservices-communication.md](./phase-9.1-microservices-communication.md)
  Add `BffModule` in `apps/gateway/src/bff/`. `GET /bff/product/:id` fans out to three backend endpoints in parallel using `Promise.allSettled` — not `Promise.all`, so a failing reviews service still returns the product. Returns composed `{ product, reviews, variants }` in one response. Forward `x-user-id` / `x-user-email` headers (already injected upstream by the JWT middleware). Add `@nestjs/axios` to gateway `package.json`.

- [x] **17. gRPC inter-service RPC with hard deadlines**
  → [phase-9.1-microservices-communication.md](./phase-9.1-microservices-communication.md)
  Create `proto/search.proto` at repo root defining `SearchService.IndexProduct(ProductPayload) returns (IndexResult)`. Add `@GrpcMethod` handler to `search-service` on port 5005. Add `SearchGrpcClientModule` to backend with a 2-second hard deadline on every call. Both gRPC (immediate sync indexing) and Kafka (guaranteed delivery + retry) coexist — gRPC for fast feedback, Kafka as the safety net. Add `@grpc/grpc-js` and `@grpc/proto-loader` to both services.

---

## Wave 8 — GraphQL

Build in strict order — resolvers first, then DataLoader, then protection rules on top.

- [x] **18. GraphQL endpoint (code-first)**
  → [phase-7.3-graphql.md](./phase-7.3-graphql.md)
  Add `GraphQLModule.forRoot<ApolloDriverConfig>` with `autoSchemaFile: true` and playground disabled in production. Create `ProductsResolver` and `OrdersResolver` with `@ObjectType()` types mirroring existing response DTOs — no business logic duplication. Add `GqlJwtGuard` that reads auth from `context.req.headers.authorization`. REST stays as the primary API; GraphQL is additive at `/graphql`. Gate behind `graphql-api` feature flag (item 11) during development. `@nestjs/graphql`, `@apollo/server`, `graphql` are already in `package.json`.

- [x] **19. DataLoader for N+1 prevention**
  → [phase-7.3-graphql.md](./phase-7.3-graphql.md)
  Create `ReviewsLoader` (REQUEST-scoped) with a batch function that receives `productIds[]` and returns all reviews in one `WHERE productId IN (...)` query, grouped by productId. In `ProductsResolver`, inject `ReviewsLoader` and call `this.reviewsLoader.load(product.id)` instead of a direct service call. REQUEST scope is critical — batching must be per-operation, not shared across concurrent requests.
  *Prerequisite: item 18*

- [x] **20. GraphQL query complexity and depth limiting**
  → [phase-7.3-graphql.md](./phase-7.3-graphql.md)
  Add `validationRules` to `GraphQLModule.forRoot`: `depthLimit(5)` from `graphql-depth-limit` and `createComplexityRule({ maximumComplexity: 100 })` from `graphql-query-complexity`. Mark expensive resolver fields with `@Extensions({ complexity: 10 })`. Log complexity score in non-production environments for tuning. Prevents `{ products { reviews { author { orders { items { ... } } } } } }` style attacks.
  *Prerequisite: item 18*

- [x] **21. Persisted queries (APQ)**
  → [phase-7.3-graphql.md](./phase-7.3-graphql.md)
  Configure Apollo's Automatic Persisted Queries on the `@apollo/server` instance using Redis as the APQ cache store (`new RedisCacheAdapter(redisClient)`). Clients send a 64-byte SHA-256 hash instead of the full query string on repeat requests. For full production hardening, pre-register approved query hashes at deploy time and reject unknown hashes in production.
  *Prerequisite: item 18*

---

## Summary

- Wave 1 — Quick Wins: items 1–4 (sorting, field selection, ETag, BullMQ dashboard)
- Wave 2 — Database: items 5–7 (concurrent indexes pattern, vertical partition, ID-range batching)
- Wave 3 — Security & Compliance: items 8–9 (encryption at rest, GDPR erasure)
- Wave 4 — Infrastructure: items 10–11 (distributed lock, feature flags)
- Wave 5 — Microservices Coordination: items 12–13 (Inbox pattern, choreography saga)
- Wave 6 — Realtime: items 14–15 (SSE, WebSocket)
- Wave 7 — Microservices Communication: items 16–17 (BFF aggregation, gRPC)
- Wave 8 — GraphQL: items 18–21 (endpoint, DataLoader, complexity, APQ)

Total: **21 items**
