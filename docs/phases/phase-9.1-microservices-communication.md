# Phase 9.1 — Microservices: Communication

**Status:** 🔲 Pending
**Builds on:** [Phase 9 — Microservices Extraction](./phase-9-microservices.md)
**Concept cluster:** Two synchronous communication patterns that complement the existing async RabbitMQ/Kafka channels — a BFF aggregation layer that eliminates N client round-trips, and gRPC for typed, low-latency internal RPC with hard deadlines.

---

## BFF Aggregation Module in Gateway

**What:** Add a Backend for Frontend (BFF) layer to the gateway that fans out to multiple services in parallel and returns a single composed response — eliminating N sequential round-trips from the frontend.

**Why:** The gateway is currently a pure reverse proxy. A product detail page requires three sequential calls: `GET /products/:id`, `GET /reviews?productId=...`, `GET /products/:id/variants`. A BFF endpoint fans these out via `Promise.allSettled` and returns a single payload. `Promise.allSettled` — not `Promise.all` — is critical: if reviews fail, the product still renders without reviews rather than the entire page failing.

**Approach:**
- Create `BffModule` in `apps/gateway/src/bff/` with `BffController` and `BffService`.
- Use `Promise.allSettled` to tolerate partial failure:

```typescript
const [product, reviews, variants] = await Promise.allSettled([
  this.http.axiosRef.get(`${backendUrl}/api/v1/products/${id}`),
  this.http.axiosRef.get(`${backendUrl}/api/v1/reviews?productId=${id}`),
  this.http.axiosRef.get(`${backendUrl}/api/v1/products/${id}/variants`),
]);
return {
  ...(product.status === 'fulfilled' ? product.value.data : {}),
  reviews: reviews.status === 'fulfilled' ? reviews.value.data : [],
  variants: variants.status === 'fulfilled' ? variants.value.data : [],
};
```

- Forward `x-user-id` and `x-user-email` headers (already injected by the JWT middleware before this handler runs).
- Route: `GET /bff/product/:id` — no `api/v1` prefix since BFF is a gateway-internal aggregation concern.

**Key files:**
- `apps/gateway/src/bff/bff.module.ts`
- `apps/gateway/src/bff/bff.controller.ts` — `GET /bff/product/:id`
- `apps/gateway/src/bff/bff.service.ts` — `Promise.allSettled` fan-out
- `apps/gateway/src/app.module.ts` — import `BffModule`
- `apps/gateway/package.json` — add `@nestjs/axios`

---

## gRPC Inter-Service Communication (with Deadlines)

**What:** Replace one HTTP-based inter-service call with typed gRPC RPC, and configure deadlines so a slow upstream cannot hold connections indefinitely.

**Why:** gRPC provides: binary wire encoding (smaller than JSON), generated TypeScript types (no hand-rolled DTOs for inter-service calls), and — critically — first-class deadline propagation. With HTTP, a slow upstream silently holds your connection. With gRPC `deadline`, the call fails after a configured duration and the caller can retry or degrade gracefully.

**gRPC vs REST vs RabbitMQ — when to use each:**

| | REST | RabbitMQ | gRPC |
|---|---|---|---|
| Communication | Sync | Async | Sync |
| Coupling | Loose (URL) | Very loose (exchange) | Tight (proto contract) |
| Deadlines | Manual timeout | N/A | Built-in |
| Use here | External/public API | Events, fan-out | Internal low-latency RPC |

gRPC is complementary — not a replacement for REST or RabbitMQ.

**Approach:**
- Create `proto/search.proto`:

```proto
syntax = "proto3";
service SearchService {
  rpc IndexProduct(ProductPayload) returns (IndexResult);
}
message ProductPayload { string id = 1; string name = 2; float price = 3; }
message IndexResult { bool success = 1; }
```

- **search-service**: `@GrpcMethod('SearchService', 'IndexProduct')` in `SearchGrpcController` on port 5005.
- **backend**: `SearchGrpcClientModule` using `ClientsModule.register({ transport: Transport.GRPC, ... })`.
- Deadlines — set on every call:

```typescript
const deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 2); // 2s hard deadline
this.searchClient.indexProduct(payload, new Metadata(), { deadline });
```

- Both gRPC and Kafka paths coexist: gRPC for immediate sync indexing, Kafka for guaranteed delivery and retry.

**Key files:**
- `proto/search.proto` — new top-level `proto/` directory
- `apps/search-service/src/search/search-grpc.controller.ts`
- `apps/backend/src/modules/search/search-grpc-client.module.ts`
- `apps/backend/src/modules/products/products.service.ts` — call gRPC client after create
- Both `package.json` files — add `@grpc/grpc-js`, `@grpc/proto-loader`
