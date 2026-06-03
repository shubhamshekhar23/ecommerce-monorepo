# Phase 2 — Reliability Patterns

**Status:** ✅ Done
**Concept cluster:** What makes systems stay up at 3am. The patterns that prevent data loss and cascading failures.

---

## What Was Built

### Idempotency Interceptor

`src/common/interceptors/idempotency.interceptor.ts`

Applied globally to `POST /api/orders`. The client sends a UUID header:

```
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

The interceptor:
1. Checks the `IdempotencyKey` table for this `(userId, key)` pair
2. If found and `COMPLETED` → returns the cached response immediately (no DB write, no charge)
3. If found and `PROCESSING` → returns 409 Conflict (another request is in-flight)
4. If not found → inserts a `PROCESSING` record, executes the handler, stores the response, marks `COMPLETED`

This solves the double-order problem: user taps "Place Order" twice on a flaky mobile connection. Both requests carry the same idempotency key. The first creates the order; the second returns the first response verbatim.

### Outbox Pattern

`src/modules/outbox/outbox.service.ts` + `src/modules/outbox/outbox.processor.ts`

Migration: `prisma/migrations/20260528000001_phase2_reliability/migration.sql`

The Outbox pattern solves the **dual-write problem**: you cannot atomically write to a database AND publish to a message broker. If the broker is down after the DB write, the event is lost forever.

Fix: write the event to an `OutboxEvent` table **in the same Prisma transaction** as the business operation:

```typescript
// Inside a Prisma transaction:
await tx.order.create({ ... });
await outboxService.publish(tx, {
  eventType: 'order.placed',
  aggregateId: order.id,
  payload: { orderId: order.id, ... },
});
```

`OutboxProcessor` runs every 5 seconds:
1. Fetches up to 50 `PENDING` events with `FOR UPDATE SKIP LOCKED` (multiple workers can run safely)
2. Publishes each event to RabbitMQ
3. On success: marks `PROCESSED`
4. On failure: increments `attempts`; after 5 failures marks `FAILED` (dead letter)

`SKIP LOCKED` is the key: it lets multiple processor instances pull events without blocking each other.

### Saga Pattern for Order Placement

`src/modules/orders/orders.service.ts`

Order creation is an orchestration saga with compensating transactions:

```
Step 1: ReserveInventory       → compensate: ReleaseInventory
Step 2: CreateOrder            → compensate: CancelOrder
Step 3: ChargePayment (Stripe) → compensate: RefundPayment
Step 4: PublishOutboxEvent     → (terminal)

If Step 3 fails → ReleaseInventory → mark order CANCELLED
```

Each step runs inside the same Prisma transaction where possible (inventory + order creation). The Stripe charge is the external call that can fail; the circuit breaker (below) guards it.

### BullMQ Job Queue

`src/modules/queue/queue.module.ts`

BullMQ is built on Redis data structures:
- Pending jobs → Redis List (`LPUSH` / `BRPOP`)
- Delayed jobs → Redis Sorted Set (score = execute_at timestamp)
- Active jobs → Redis Hash
- Failed jobs → Redis Sorted Set (dead letter queue)

The `NOTIFICATIONS` queue is registered for background jobs (invoice generation, abandoned cart, stock alerts). After Phase 9, notification delivery itself moved to the standalone notification-service, but the queue module remains for compute-intensive background tasks.

Retry config: exponential backoff with jitter:
```typescript
const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
const jitter = delay * Math.random() * 0.3; // ±30%
```
Jitter prevents the thundering herd: 1000 failed jobs retrying at exactly the same interval would simultaneously hammer the downstream service.

### Circuit Breaker

`src/modules/circuit-breaker/circuit-breaker.service.ts`

Uses `opossum` library. Wraps every Stripe API call.

State machine:
- **Closed** (normal) — all requests pass through
- **Open** (tripped) — all requests fail immediately with `ServiceUnavailableException` (no network call)
- **Half-Open** (recovery probe) — one request allowed; if it succeeds, closes the circuit

Config: 50% error threshold, 5-request minimum volume, 30-second reset window.

Without this: if Stripe is slow/down, every order request blocks for the full HTTP timeout (30s), exhausting the thread pool and taking down the entire app.

### Stripe Webhook Deduplication

`src/modules/stripe/stripe.service.ts`

Stripe retries webhook delivery for up to 72 hours. Without deduplication, `payment_intent.succeeded` could fire twice and confirm the same order twice.

Fix: insert the Stripe event ID into a unique column before processing. If the INSERT conflicts (already processed), return 200 immediately. `ON CONFLICT DO NOTHING` is the atomic check-and-insert.

---

## Key Files

- `src/common/interceptors/idempotency.interceptor.ts`
- `src/modules/outbox/outbox.service.ts`
- `src/modules/outbox/outbox.processor.ts`
- `src/modules/circuit-breaker/circuit-breaker.service.ts`
- `src/modules/queue/queue.module.ts`
- `src/modules/orders/orders.service.ts`
- `prisma/migrations/20260528000001_phase2_reliability/migration.sql`

---

## Core Concept: At-Least-Once vs At-Most-Once

Exactly-once delivery is impossible in distributed systems. The Outbox pattern gives you **at-least-once** (duplicates possible, so consumers must be idempotent) which is correct for events like "order.placed". The idempotency key gives at-most-once semantics at the API layer. Together they form a safe, complete reliability strategy.
