# Phase 4 — Event-Driven Architecture

**Status:** ✅ Done
**Concept cluster:** The concept that unlocks decoupled, scalable systems. Adding a new subscriber costs zero changes to the emitter.

---

## What Was Built

### Domain Events with EventEmitter2

`src/modules/events/` defines the domain event classes:

- `OrderCreatedEvent` — emitted when an order is successfully created
- `OrderStatusChangedEvent` — emitted on every status transition
- `PaymentConfirmedEvent` — emitted when Stripe webhook confirms payment

Before (tightly coupled):
```typescript
// OrderService directly called every downstream module
await this.mailService.sendOrderConfirmation(order);
await this.inventoryService.decrementStock(items);
await this.analyticsService.recordSale(order);
```

After (event-driven):
```typescript
this.eventEmitter.emit('order.created', new OrderCreatedEvent(order));
// Each module subscribes with @OnEvent('order.created')
// OrderService knows nothing about who listens or how many
```

Adding a `VendorModule` that emails the vendor on each order costs zero changes to `OrderModule`. This is the open/closed principle applied to services.

Note: these are **domain events** (in-process, synchronous via EventEmitter2). **Integration events** that cross service boundaries go through the Outbox → RabbitMQ pipeline (Phase 2). The two are intentionally separate.

### CQRS — ProductRating Read Model

`src/modules/reviews/reviews.service.ts` + `prisma/schema.prisma` (ProductRating model)

Write model (strict, normalised): `ProductReview` — one row per review, with moderation status.

Read model (fast, denormalised): `ProductRating` — one row per product with `avgRating` and `reviewCount` pre-computed.

The read model is updated by subscribing to the `review.approved` event:

```typescript
@OnEvent('review.approved')
async updateProductRating(event: ReviewApprovedEvent) {
  // Recomputes avg from all approved reviews, upserts ProductRating row
}
```

The product listing query becomes:
```sql
SELECT p.*, pr.avgRating, pr.reviewCount
FROM "Product" p
LEFT JOIN "ProductRating" pr ON pr.productId = p.id
```

No GROUP BY across thousands of reviews on every request. The aggregate is always pre-computed.

This is CQRS: the write path (submitting a review) and the read path (displaying the product card) are completely separate. The read model is **eventually consistent** — there is a short window after approval where the review exists but the aggregate hasn't updated yet. This is acceptable for display purposes.

### Order State Machine

`src/modules/orders/orders.service.ts`

Valid transitions are encoded as a map:

```typescript
const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  ['REFUNDED'],
  CANCELLED:  [],
  REFUNDED:   [],
};
```

Any attempt to transition to a status not in the allowed list throws a `BadRequestException`. This prevents:
- A delivered order from being cancelled by a bug
- An admin accidentally re-cancelling an already-cancelled order
- Any invalid state that would corrupt downstream workflows (shipping label re-generation, double refunds)

The transition logic runs inside a transaction so the status update and the `OrderStatusChangedEvent` emission are atomic with the DB write.

---

## Key Concepts

**Commands vs Queries vs Events**:
- Command: changes state (`POST /orders` → creates an order)
- Query: reads state (`GET /orders/me` → reads from read model)
- Event: reports what happened (`OrderCreatedEvent` → subscribers react)

They should never cross. A query handler should never emit a command. An event handler should never return data to the original caller.

**Eventual consistency**: the `ProductRating` read model lags behind the write model by the time it takes EventEmitter2 to call the handler (milliseconds in-process). This is fine for product listings. It is NOT fine for stock checks at checkout — those always read the write model (ProductVariant.stock) directly.

---

## Key Files

- `src/modules/events/` (event class definitions)
- `src/modules/reviews/reviews.service.ts` (CQRS: updates ProductRating)
- `src/modules/orders/orders.service.ts` (state machine, event emission)
- `prisma/schema.prisma` (ProductRating model)
