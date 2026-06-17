# Phase 9.4 — Microservices: Event Architecture

**Status:** ✅ Done
**Builds on:** [Phase 9.3 — Microservices: Resilience](./phase-9.3-microservices-resilience.md)
**Concept cluster:** Append-only event logging for the order domain — capturing every state transition as an immutable record so order history can be replayed, audited, or projected into any shape without querying the mutable state table.

---

## Order Event Log (Append-Only Event Stream)

**What:** Add an append-only `OrderEvent` table that records every order state transition as an immutable event. The full history of an order can be replayed to reconstruct state at any point in time.

**Naming note:** This is called "Event Log" rather than "Event Sourcing" because we are keeping the mutable `Order.status` column as a materialized projection — not replacing it. True event sourcing would derive `status` exclusively from replaying events. An event log that coexists with mutable state is still highly valuable (full audit trail, replay, projections) and has a much smaller implementation footprint.

**Event Sourcing vs Event Log — when to use each:**

| | Event Log (this item) | Full Event Sourcing |
|---|---|---|
| State storage | Mutable current-state table + event append log | Events only — state derived by replay |
| Migration cost | Additive — no schema changes to existing tables | Major refactor — remove mutable state |
| Replay | Possible | Required |
| Query complexity | Low — current state from one row | High — requires projection layer |
| Use here | ✅ Order history and audit | Later, if needed for complex projections |

**Why:** Orders currently have a mutable `status` column — changing status overwrites the previous value. There is no record of *when* the transition happened, *how long* the order was in each state, or *in what sequence* transitions occurred. An event log makes all of this queryable without any change to the existing write path (the `status` column stays).

**Events to capture:**

```
OrderPlaced      { orderId, userId, total, items[] }
PaymentConfirmed { orderId, paymentIntentId, amount }
OrderProcessing  { orderId }
OrderShipped     { orderId, trackingNumber, carrier }
OrderDelivered   { orderId, deliveredAt }
OrderCancelled   { orderId, reason }
RefundInitiated  { orderId, returnId, amount }
```

**Approach:**
- Add `OrderEvent` model to `schema.prisma`:

```prisma
model OrderEvent {
  id          String   @id @default(cuid())
  orderId     String
  type        String
  payload     Json
  occurredAt  DateTime @default(now())
  order       Order    @relation(fields: [orderId], references: [id])

  @@index([orderId, occurredAt])
}
```

- Create `OrderEventStore` service with:
  - `append(orderId, type, payload)` — always inserts, never updates.
  - `getEvents(orderId)` — returns events in `occurredAt` order.
  - `getSnapshot(orderId, asOf: Date)` — replays events up to a timestamp to reconstruct state.

- In `OrderSagaService`, call `eventStore.append()` at each state transition *alongside* the existing `prisma.order.update({ status })`. The status column remains the materialized projection for fast point queries; the event log is the source of truth for history.

- Expose `GET /orders/:id/events` returning the full event stream for an order (admin + order owner only).

**Key files:**
- `apps/backend/prisma/schema.prisma` — add `OrderEvent` model
- `apps/backend/prisma/migrations/<timestamp>_order_event_log/migration.sql`
- `apps/backend/src/modules/orders/order-event-store.service.ts` — new service
- `apps/backend/src/modules/orders/orders.module.ts` — register `OrderEventStore`
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — call `eventStore.append()` at each transition
- `apps/backend/src/modules/orders/orders.controller.ts` — `GET :id/events`
