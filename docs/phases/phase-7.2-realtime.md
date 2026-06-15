# Phase 7.2 — Realtime APIs

**Status:** 🔲 Pending
**Builds on:** [Phase 7.1 — API Advanced](./phase-7.1-api-advanced.md)
**Concept cluster:** Two server-push channels — SSE for unidirectional status updates to individual users, and WebSockets for bidirectional real-time feeds to admin dashboards. Different protocols for different access patterns.

---

## SSE for Order Status Stream

**What:** Open a Server-Sent Events connection (`GET /orders/:id/status-stream`) that pushes real-time order status updates (PENDING → PAID → PROCESSING → SHIPPED) to the browser as they happen, without polling.

**Why:** The frontend currently has no way to know when order status changes without polling `GET /orders/:id` every few seconds. SSE is the right protocol here — the flow is strictly server-to-client (no client messages needed), the browser's `EventSource` API handles reconnection automatically, and SSE works over standard HTTP/1.1 with no protocol upgrade.

**SSE vs WebSocket for this use case:**

| | SSE | WebSocket |
|---|---|---|
| Direction | Server → Client only | Bidirectional |
| Protocol | HTTP/1.1 | Upgraded TCP |
| Reconnection | Automatic (browser) | Manual |
| Proxying | Works with standard proxies | Requires proxy support |
| Use here | Order status updates | Admin feed (Phase 7.2) |

**Approach:**
- In `OrdersController`, add `@Sse(':id/status-stream')` returning `Observable<MessageEvent>`.
- `OrderStatusRegistry` — a `Map<orderId, Subject<MessageEvent>>` scoped to the process.
- When `OrderSagaService` transitions status, emit to the Subject for that order.
- For multi-replica deployment: replace the in-process Subject with Redis Pub/Sub on `order:status:{orderId}` — each replica subscribes when a client connects, unsubscribes on disconnect.
- `@Header('Cache-Control', 'no-cache')` and `@Header('X-Accel-Buffering', 'no')` prevent Nginx/gateway from buffering the stream.

**Key files:**
- `apps/backend/src/modules/orders/orders.controller.ts` — `@Sse(':id/status-stream')`
- `apps/backend/src/modules/orders/order-status.registry.ts` — new Subject registry
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — emit on status transitions
- `apps/gateway/src/main.ts` — proxy must not buffer SSE (set `proxyTimeout: 0` or equivalent)

---

## WebSocket Admin Real-Time Order Feed

**What:** Push every new order to connected admin dashboard clients over a WebSocket so admins see orders appear in real-time without refreshing.

**Why:** The admin orders list is currently REST-only — admins must poll or refresh manually. WebSockets are the right protocol for the admin dashboard because: (a) the admin might eventually send commands back (claim an order, mark as reviewed) over the same connection, and (b) namespace-based rooms allow fine-grained subscriptions without multiple HTTP connections.

**Approach:**
- Create `OrdersGateway` with `@WebSocketGateway({ namespace: '/admin/orders', cors: { origin: process.env.CORS_ORIGIN } })`.
- On connection, extract the bearer token from `socket.handshake.auth.token`, verify it, and assert `ADMIN` role — disconnect unauthorized clients immediately.
- In `OrderSagaService`, after order creation: `ordersGateway.server.emit('order:created', sanitizedOrder)`.
- Frontend: `const socket = io('/admin/orders', { auth: { token } }); socket.on('order:created', handler)`.
- Use `socket.io-adapter-redis` if running multiple replicas so events broadcast to all connected admins regardless of which replica they connected to.

**Key files:**
- `apps/backend/src/modules/orders/orders.gateway.ts` — new `@WebSocketGateway`
- `apps/backend/src/modules/orders/orders.module.ts` — register gateway
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — inject gateway, call emit
- `apps/backend/package.json` — add `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
