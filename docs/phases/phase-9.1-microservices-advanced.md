# Phase 9.1 — Microservices Advanced

**Status:** 🔲 Pending
**Builds on:** [Phase 9 — Microservices Extraction](./phase-9-microservices.md)
**Concept cluster:** Five patterns that mature a microservices architecture — aggregating responses at the gateway, replacing HTTP with typed RPC, making sagas event-driven, keeping the system useful under partial failure, and recording state as an immutable event stream.

---

## BFF Aggregation Module in Gateway

**What:** Add a Backend for Frontend (BFF) layer to the gateway that fans out to multiple services in parallel and returns a single composed response — eliminating N sequential round-trips from the frontend.

**Why:** The gateway is currently a pure reverse proxy. For a product detail page, the frontend makes three sequential calls: `GET /products/:id`, `GET /reviews?productId=...`, `GET /products/:id/variants`. A BFF endpoint fans these out in parallel via `Promise.all` and returns a single composed payload — 1 call instead of 3, with parallel latency instead of sequential.

**Approach:**
- Create `BffModule` in `apps/gateway/src/bff/` with a `BffController` and `BffService`.
- `BffService` uses `HttpService` (`@nestjs/axios`) to call the backend in parallel:

```typescript
const [product, reviews, variants] = await Promise.all([
  this.http.axiosRef.get(`${backendUrl}/api/v1/products/${id}`),
  this.http.axiosRef.get(`${backendUrl}/api/v1/reviews?productId=${id}`),
  this.http.axiosRef.get(`${backendUrl}/api/v1/products/${id}/variants`),
]);
return { ...product.data, reviews: reviews.data, variants: variants.data };
```

- Forward `x-user-id` and `x-user-email` headers from the JWT middleware (already injected by the gateway before this handler).
- Route: `GET /bff/product/:id` — no `api/v1` prefix since BFF is a gateway-internal aggregation endpoint.

**Key files:**
- `apps/gateway/src/bff/bff.module.ts`
- `apps/gateway/src/bff/bff.controller.ts` — `GET /bff/product/:id`
- `apps/gateway/src/bff/bff.service.ts` — parallel fetch logic
- `apps/gateway/src/app.module.ts` — import `BffModule`
- `apps/gateway/package.json` — add `@nestjs/axios` if not present

---

## gRPC Inter-Service Communication

**What:** Replace one HTTP-based inter-service call with a typed gRPC RPC, demonstrating Protocol Buffers, binary wire format, and strongly-typed service contracts.

**Why:** gRPC provides: binary encoding (smaller than JSON), generated TypeScript types (no hand-rolled DTOs for inter-service calls), built-in deadlines, and bidirectional streaming support. It is the industry standard for synchronous microservice RPC. Teaching moment: when to use gRPC (sync, latency-sensitive, internal) vs RabbitMQ (async, guaranteed delivery, fan-out).

**Approach:**
- Create `proto/search.proto` with a `SearchService` RPC: `rpc IndexProduct(ProductPayload) returns (IndexResult)`.
- **search-service**: add `@GrpcMethod('SearchService', 'IndexProduct')` handler in a new `SearchGrpcController` on port 5005.
- **backend**: `SearchGrpcClientModule` using `ClientsModule.register({ transport: Transport.GRPC, protoPath: 'proto/search.proto', url: 'search-service:5005' })`.
- Call `searchGrpcClient.indexProduct(product)` from `ProductsService` after creation as an alternative to the Kafka async path.
- Both paths can coexist: gRPC for immediate sync indexing, Kafka for guaranteed delivery on retries.

**Key files:**
- `proto/search.proto` — service definition (new top-level `proto/` directory)
- `apps/search-service/src/search/search-grpc.controller.ts`
- `apps/backend/src/modules/search/search-grpc-client.module.ts`
- `apps/backend/src/modules/products/products.service.ts` — call client after create
- Both `package.json` files — add `@grpc/grpc-js`, `@grpc/proto-loader`

---

## Saga Choreography — Review Approval Flow

**What:** Replace direct service calls in the review moderation flow with a choreography-based saga: each service reacts to domain events with no central orchestrator.

**Why:** Choreography saga: each participant listens for an event and emits its own. The full flow emerges from event subscriptions rather than a coordinator that knows all the steps. More resilient (no single point of failure), more loosely coupled (ProductService doesn't know NotificationService exists).

**Flow:**
```
ReviewService emits → review.approved
  ProductService listens  → recalculates avgRating, reviewCount
  NotificationService listens → emails reviewer "Your review is live"
  AuditService listens   → logs approval event
```

**Approach:**
- Define `ReviewApprovedEvent` and `ReviewRejectedEvent` in `@ecommerce/shared-types`.
- `ReviewsService.approve()` publishes to RabbitMQ exchange `review.events` with routing key `review.approved`.
- `ProductsService` subscribes with `@RabbitSubscribe` and calls `recalculateRating(productId)`.
- `NotificationService` subscribes and sends approval/rejection email.
- No orchestrator — just events and independent handlers.

**Key files:**
- `packages/shared-types/src/events/review.events.ts` — new event types
- `apps/backend/src/modules/reviews/reviews.service.ts` — publish on state change
- `apps/backend/src/modules/products/products.service.ts` — subscribe, recalculate rating
- `apps/notification-service/src/` — subscribe, send email

---

## Graceful Degradation

**What:** Two degradation paths: search falls back to a DB full-text query when search-service is unavailable; payment failures enqueue a retry job rather than immediately failing the order.

**Why:** Graceful degradation keeps the system usable under partial failure. A down search-service currently returns 502 — users cannot browse. A transient Stripe error currently cancels the order — the user has to start over. Both can be handled without impacting the user experience.

**Approach:**

Search fallback:
- In `ProductsService.search()`, wrap the call to search-service in a try/catch.
- On failure (timeout, 5xx), log a warning and fall back to `prisma.product.findMany({ where: { name: { contains: q, mode: 'insensitive' } } })`.
- Wire the existing `CircuitBreakerService` into this path — open circuit after 5 consecutive search failures to avoid hammer retries.

Payment retry queue:
- On `StripeService` charge failure with a retriable error code (network error, rate limit — not card decline), instead of throwing, enqueue a `payment-retry` BullMQ job with `orderId` and `paymentIntentId`.
- Processor retries 3× with exponential backoff. On exhaustion, emit `order.payment.failed` → saga marks order CANCELLED and restores cart.

**Key files:**
- `apps/backend/src/modules/products/products.service.ts` — search fallback + circuit breaker
- `apps/backend/src/modules/stripe/stripe.service.ts` — enqueue retry on retriable errors
- `apps/backend/src/modules/payments/payment-retry.processor.ts` — new BullMQ processor
- `apps/backend/src/modules/circuit-breaker/circuit-breaker.service.ts` — already exists, wire in

---

## Event Sourcing — Order Event Store

**What:** Add an append-only `OrderEvent` table that records every order state transition as an immutable event. Order history can be replayed to reconstruct state at any point in time.

**Why:** Orders currently have a mutable `status` column — changing status overwrites the previous value. There is no record of *when* the transition happened or in what sequence. Event sourcing stores `OrderPlaced`, `PaymentConfirmed`, `OrderShipped`, `OrderDelivered` as immutable records. Current `status` becomes a projection of those events. This is additive — the existing status column stays as the materialized view.

**Approach:**
- Add `OrderEvent` model: `{ id, orderId, type, payload Json, occurredAt DateTime }`.
- Create `OrderEventStore` service with `append(orderId, type, payload)` and `getEvents(orderId)`.
- In `OrderSagaService`, call `eventStore.append()` at each state transition alongside the existing `prisma.order.update({ status })`.
- Expose `GET /orders/:id/events` returning the full event stream for an order.
- Do NOT replace the `status` column — keep it as a materialized projection. Event store is additive.

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `OrderEvent` model
- `apps/backend/prisma/migrations/<timestamp>_order_event_store/migration.sql`
- `apps/backend/src/modules/orders/order-event-store.service.ts` — new service
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — call eventStore at each transition
- `apps/backend/src/modules/orders/orders.controller.ts` — `GET :id/events`
- `apps/backend/src/modules/orders/orders.module.ts` — register `OrderEventStore`
