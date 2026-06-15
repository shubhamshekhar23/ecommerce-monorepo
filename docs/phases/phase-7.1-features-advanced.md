# Phase 7.1 — Features Advanced

**Status:** 🔲 Pending
**Builds on:** [Phase 7 — Core Feature Backfill](./phase-7-features.md)
**Concept cluster:** Five API and protocol features that extend the existing REST surface — dynamic client-controlled querying, two realtime push channels, and two alternative API protocols (GraphQL and SSE).

---

## Dynamic REST Sorting `?sort=field:asc`

**What:** Accept `?sort=price:asc` or `?sort=createdAt:desc` on list endpoints and translate it into a Prisma `orderBy` clause. Validate against an allowlist to prevent arbitrary column exposure.

**Why:** Products and orders are currently returned in fixed order (newest first). Clients cannot request by price, rating, or name without fetching all records and sorting client-side — which forces full-dataset fetches.

**Approach:**
- Add `sort?: string` to `FindProductsDto` with `@IsOptional() @Matches(/^(price|name|createdAt|avgRating):(asc|desc)$/)`.
- Create `parseSortParam(sort: string): Prisma.ProductOrderByWithRelationInput` utility in `common/utils/sort.util.ts`.
- Pass result to `prisma.product.findMany({ orderBy: parseSortParam(sort) })`.
- Same pattern on `OrderQueryService` (sortable by `createdAt`, `total`).

**Key files:**
- `apps/backend/src/modules/products/dto/find-products.dto.ts` — add `sort` field
- `apps/backend/src/common/utils/sort.util.ts` — new parser
- `apps/backend/src/modules/products/products.service.ts` — pass `orderBy`
- `apps/backend/src/modules/orders/queries/order-query.service.ts` — same pattern

---

## Field Selection `?fields=` Response Interceptor

**What:** Accept `?fields=id,name,price` and strip all other top-level fields from the JSON response in a global interceptor, reducing payload size for bandwidth-constrained clients.

**Why:** Every endpoint returns the full DTO regardless of how many fields the client needs. Mobile clients on slow connections benefit from smaller payloads. Field selection is the REST equivalent of GraphQL's per-query field picking without requiring a schema migration.

**Approach:**
- Create `FieldSelectionInterceptor implements NestInterceptor`.
- In `intercept()`: read `request.query.fields`, split by comma, use `tap()` on the response Observable to filter object keys.
- Apply as global interceptor in `main.ts` via `app.useGlobalInterceptors(new FieldSelectionInterceptor())`.
- Only apply when `fields` param is present; pass through untouched otherwise.
- Handles top-level fields only.

**Key files:**
- `apps/backend/src/common/interceptors/field-selection.interceptor.ts` — new file
- `apps/backend/src/common/interceptors/index.ts` — export it
- `apps/backend/src/main.ts` — register as global interceptor

---

## SSE for Order Status Stream

**What:** Open a Server-Sent Events connection (`GET /orders/:id/status-stream`) that pushes real-time order status updates to the browser as they happen, without polling.

**Why:** The frontend currently has no way to know when order status changes without polling `GET /orders/:id` repeatedly. SSE is simpler than WebSockets for unidirectional server-to-client streams. The browser's native `EventSource` API handles reconnection automatically.

**Approach:**
- In `OrdersController`, add `@Sse(':id/status-stream')` returning `Observable<MessageEvent>`.
- The Observable wraps a `Subject<MessageEvent>` stored in an `OrderStatusRegistry` (Map keyed by `orderId`).
- When `OrderSagaService` transitions order status, emit to the Subject for that order.
- For multi-replica deployment: replace the in-process Subject with a Redis Pub/Sub subscription on `order:status:{orderId}` — each replica subscribes when a client connects and unsubscribes on disconnect.
- Add `@Header('Cache-Control', 'no-cache')` and `@Header('X-Accel-Buffering', 'no')` (prevents Nginx buffering SSE).

**Key files:**
- `apps/backend/src/modules/orders/orders.controller.ts` — add `@Sse` endpoint
- `apps/backend/src/modules/orders/order-status.registry.ts` — new Subject registry
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — emit on status transitions
- `apps/gateway/src/main.ts` — ensure the gateway proxy does not buffer the SSE response

---

## WebSocket Admin Real-Time Order Feed

**What:** Push every new order event to connected admin dashboard clients over a WebSocket so admins see orders appear in real-time without refreshing.

**Why:** The admin orders endpoint is currently REST-only. WebSockets are bidirectional — admins could also acknowledge or claim orders over the same connection. NestJS `@WebSocketGateway` with Socket.IO handles connection lifecycle, rooms, and namespaces out of the box.

**Approach:**
- Create `OrdersGateway` with `@WebSocketGateway({ namespace: '/admin/orders' })`.
- On connection, verify the bearer token from the handshake `auth` object and assert `ADMIN` role; disconnect unauthorized clients.
- In `OrderSagaService`, after order creation call `ordersGateway.server.emit('order:created', order)`.
- Frontend: `const socket = io('/admin/orders', { auth: { token } }); socket.on('order:created', handler)`.

**Key files:**
- `apps/backend/src/modules/orders/orders.gateway.ts` — new `@WebSocketGateway`
- `apps/backend/src/modules/orders/orders.module.ts` — register gateway
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — inject gateway, call emit
- `apps/backend/package.json` — add `@nestjs/websockets`, `@nestjs/platform-socket.io`

---

## GraphQL Endpoint (Code-First)

**What:** Expose a GraphQL API alongside the existing REST API using NestJS code-first approach. Clients can query exactly the fields they need across multiple resources in a single request.

**Why:** GraphQL solves over-fetching and under-fetching. Code-first means TypeScript classes with `@ObjectType()` / `@Field()` decorators generate the SDL schema automatically — no separate `.graphql` files to keep in sync. REST endpoints remain unchanged; GraphQL is additive.

**Approach:**
- Install `@nestjs/graphql`, `@apollo/server`, `graphql`.
- In `AppModule`: `GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: true })`.
- Create `ProductsResolver` with `@Query(() => [ProductType])` delegating to `ProductsService`.
- Initial query set: `products`, `product(id)`, `orders`.
- `@ObjectType()` classes mirror existing response DTOs — no business logic duplication.
- Playground at `/graphql` in development.

**Key files:**
- `apps/backend/src/modules/products/products.resolver.ts` — new resolver
- `apps/backend/src/modules/products/types/product.type.ts` — `@ObjectType()` class
- `apps/backend/src/modules/orders/orders.resolver.ts` — new resolver
- `apps/backend/src/app.module.ts` — import `GraphQLModule`
- `apps/backend/package.json` — add `@nestjs/graphql`, `@apollo/server`, `graphql`
