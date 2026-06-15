# Phase 7 — Core Feature Backfill

**Status:** ✅ Done (including backfill — see below)
**Concept cluster:** Each feature is a pattern exercise. The business feature is the vehicle; the pattern is the lesson.

Migration: `prisma/migrations/20260528000003_phase7_features/migration.sql`
Backfill migration: `prisma/migrations/20260615000000_phase7_backfill_variant_ids/migration.sql`

## Backfill Completed (2026-06-15)

The following gaps were closed after the initial Phase 7 implementation:

**Reviews**
- `approveReview` now guards `PENDING` status only — double-approve throws `BadRequestException`
- `rejectReview` allows `PENDING → REJECTED` (normal) and `APPROVED → REJECTED` (admin reversal); the latter emits `REVIEW_REJECTED_EVENT` to recompute `ProductRating`
- `ProductRating.avgRating` and `reviewCount` are now included in all product list/detail/search responses

**Returns**
- `PATCH /returns/:id/refund` endpoint added — `APPROVED → REFUNDED` is now reachable
- `StripeService` injected directly into `ReturnsService` (removed duck-typed parameter)
- `approve` and `reject` now guard `PENDING` status and write `AuditLog` entries
- Refund restocking now targets the specific purchased variant (`OrderItem.variantId`) rather than all variants under the product

**Stock Alerts**
- `StockAlert.notified` is now set to `true` by the processor after successful email delivery, not by the service after enqueue — BullMQ retries reach undelivered subscribers
- Subscriptions are now variant-level: `variantId` added to `StockAlert` (nullable for product-level subscriptions); restock event payload extended with `variantId`; fan-out filters to exact variant subscribers + product-level subscribers

**Tax**
- `TaxService.calculate()` is now called during order creation in `order-saga.service.ts`
- `Order.taxAmount` and `Order.subtotal` are populated on every new order
- `totalPrice = subtotal + shippingCost + taxAmount`
- `isExempt` rule added as the first (highest-priority) tax rule

**Vendor Marketplace**
- `POST /products` and `PUT /products/:id` and `DELETE /products/:id` now allow `VENDOR` role
- Vendors can only update/delete products they own (`product.vendorId === actorId`); admin bypasses the check
- `vendorId` is automatically set on product creation when the actor is a VENDOR

---

## What Was Built

### Address Management — Snapshot Pattern

`src/modules/addresses/`

Users can save multiple shipping addresses. The important lesson is in how addresses relate to orders.

A naïve approach stores `Order.shippingAddressId` as a FK. If the user later edits their address, the order history shows the _updated_ address — not the one they actually shipped to. This is wrong for receipts, invoices, and fraud disputes.

The correct approach: `Order.shippingAddress` is a **JSONB column** — a snapshot of the address taken at checkout time:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "line1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "US"
}
```

The FK relationship is used only to _populate_ the snapshot at order creation. After that, the order is immutable even if the user changes their address 10 times. The `addresses` table still exists for the "saved addresses" feature — it just doesn't drive historical order data.

### Coupon System — Optimistic Locking

`src/modules/coupons/coupons.service.ts`

When 1000 users simultaneously apply the last use of a coupon (`maxUses = 1`), who wins?

Wrong approach: `SELECT → check → UPDATE` — 1000 requests all read `usedCount = 0`, all pass the check, all increment → 1000 uses of a single-use coupon.

Correct approach: one atomic operation:

```sql
UPDATE "Coupon"
SET "usedCount" = "usedCount" + 1
WHERE id = $id AND "usedCount" < "maxUses"
RETURNING id;
```

If 0 rows are affected, the coupon is exhausted. No SELECT needed. No application-level check. This is optimistic locking — the database is the arbiter of truth.

A `CouponUsage` record is also inserted with `(couponId, userId)` unique constraint to prevent one user from applying the same coupon twice.

### Shipping Calculation — Strategy Pattern

`src/modules/shipping/shipping.service.ts`

Shipping cost is calculated using the strategy pattern: a `ShippingCalculator` interface with pluggable implementations. Current implementations include flat-rate and weight-based calculators. A real carrier API (UPS, FedEx) would implement the same interface without changing the caller.

### Tax Engine — Rules Engine Pattern (it seems TODO)

`src/modules/tax/tax.service.ts`

Tax rules are encoded as a set of conditions evaluated in order: country → state → product category → user type. The first matching rule wins. Adding a new tax rule (e.g. reduced rate for medical products) means adding a rule, not changing the calculation logic.

### Product Reviews — Moderation + Materialized Aggregate

`src/modules/reviews/reviews.service.ts`

Review lifecycle:

1. User submits → status: `PENDING`
2. Admin approves → status: `APPROVED`, fires `review.approved` event
3. Event handler recomputes `ProductRating.avgRating` and `reviewCount` from all approved reviews

The `ProductRating` row is the CQRS read model (also implemented in Phase 4). Product listing queries join to `ProductRating` for a single pre-computed value rather than running `AVG(rating)` across thousands of reviews on every request.

### Back-in-Stock Alerts — Fan-Out Pattern

`src/modules/stock-alerts/stock-alerts.service.ts`  
`src/modules/stock-alerts/stock-alert.processor.ts`

Users can subscribe to a product variant. When an admin updates a variant's stock via `PATCH /products/:productId/variants/:variantId/stock` and the stock transitions from 0 to a positive value, `VariantsService` emits `product.restocked`. `StockAlertsService` listens via `@OnEvent` and fans out to all subscribers:

```
1 StockReplenished event
  → Load all StockAlert rows for this product
  → Emit N individual email jobs (one per subscriber)
  → Mark each StockAlert.notified = true
```

The fan-out is intentionally async (via BullMQ) so restocking 10,000 subscribers does not block the HTTP response.

The job payload is a complete snapshot — `alertId`, `email`, `productName`, and `productSlug` are all captured at enqueue time. The processor never needs to query the DB to build the email or the product URL. This matters if the product is renamed or deleted between enqueue and delivery.

### Return/Refund Workflow — State Machine

`src/modules/returns/returns.service.ts`

Return requests follow a state machine:

```
PENDING → APPROVED → REFUNDED
PENDING → REJECTED
```

On `APPROVED → REFUNDED`:

1. Call Stripe's Refunds API with the original `paymentIntentId`
2. Store Stripe's `refundId` on the `ReturnRequest` for reconciliation
3. Restock the returned items (increment `ProductVariant.stock`)
4. Update the original order status to `REFUNDED`

Each state transition creates an `AuditLog` entry.

### PDF Invoice Generation — Background Job Pattern

`src/modules/invoices/invoice.service.ts`  
`src/modules/invoices/invoice.processor.ts`  
`src/modules/invoices/invoice.utils.ts`

PDF generation is CPU-intensive (pdfkit renders fonts, lays out text). It should never block an HTTP response.

The pattern separates enqueueing from delivery:

- **Auto-trigger** — `InvoiceService` listens for `OrderStatusChangedEvent` via `@OnEvent`. When an order transitions to `CONFIRMED` (either via admin or after Stripe payment), a PDF job is enqueued automatically. No manual HTTP call needed.
- `POST /api/orders/:orderId/invoice` — manual enqueue endpoint, useful for re-generating a lost invoice. Idempotent: if the PDF already exists on disk the job is not re-enqueued.
- `InvoiceProcessor` (concurrency 2) — picks up the job, queries the full order with line items, renders a PDF via pdfkit, and writes it to `uploads/invoices/invoice-<orderId>.pdf`.
- `GET /api/orders/:orderId/invoice` — checks whether the file exists. If not yet ready, returns 202 so the client knows to retry. Once ready, streams from disk via `createReadStream(...).pipe(res)` — no memory buffering, safe for large files.

Idempotency: the `jobId: invoice:<orderId>` deduplicates rapid double-enqueues. The processor uses exponential backoff (5 s base, 3 attempts) so transient DB failures retry automatically.

This is the pattern for any slow operation (report generation, CSV export, image resizing): move it off the HTTP thread and let the client poll.

### Vendor Schema Preparation

`prisma/schema.prisma` — `User.role` includes `VENDOR` and `Product.vendorId` is a nullable FK.

This is an **expand step** in the expand-contract pattern: the schema supports vendor data now even though the full vendor marketplace features are not built yet. Existing records have `vendorId = null` (B2C model). When marketplace features are built, the column is already there and indexed, migration costs nothing.

---

### BullMQ Processors — Consumer Implementation

`src/modules/stock-alerts/stock-alert.processor.ts`  
`src/modules/cart/cart-recovery.processor.ts`

A BullMQ queue has two sides: a producer (adds jobs) and a processor (consumes jobs). All three queues are fully wired — producers enqueue jobs from real business events and processors consume them.

**How a processor is wired**

```typescript
@Processor(QUEUE_NAMES.STOCK_ALERTS, { concurrency: 5 })
export class StockAlertProcessor extends WorkerHost {
  async process(job: Job<StockAlertJobData>): Promise<void> {
    await this.mailService.sendStockAlertEmail(...);
  }
}
```

`@Processor` registers the class as a BullMQ `Worker` bound to the named queue. NestJS's DI wires the dependencies. `WorkerHost` provides the lifecycle (start/stop on module init/destroy). `concurrency: 5` means up to 5 jobs run in parallel — each email send is an SMTP call, so they can overlap without blocking each other.

**Retry with exponential backoff + jitter**

Both processors use `backoff: { type: 'custom' }` in `defaultJobOptions` and define a `backoffStrategy` function on the worker:

```typescript
function backoffWithJitter(attemptsMade: number): number {
  const delay = Math.min(BASE_DELAY_MS * 2 ** attemptsMade, MAX_DELAY_MS);
  return Math.floor(delay + delay * Math.random() * 0.3);
}
```

- Attempt 1 → ~2s delay
- Attempt 2 → ~4s delay
- Attempt 3 → ~8s delay (capped at 30s)

The `Math.random() * 0.3` adds up to 30% jitter. Without jitter, if 1000 email jobs all fail at the same time (SMTP server down), they all retry at exactly the same moment and hammer the server again in a synchronized wave. With jitter, the retries spread out across a window, giving the SMTP server time to recover.

**Cart recovery — trigger and cancel**

`CartService.addItem` calls `CartRecoveryService.scheduleCheck(userId, cartId)` after every successful add. The job uses `jobId: cart-recovery:<userId>` so re-scheduling replaces the previous job — if the user keeps adding items, the 1-hour clock resets each time.

`CartRecoveryService` listens for `OrderCreatedEvent` via `@OnEvent`. When the user places an order, `cancelCheck(userId)` removes the pending delayed job from Redis before it fires.

The processor also has an idempotency check as a safety net:

```typescript
if (!cart || cart.items.length === 0) return; // user already checked out
```

If the job fires but the cart is already empty (e.g. cancellation raced with job removal), it silently skips — no email, no retry.

**Process model — same process vs. separate worker**

All processors run inside the same Node.js process as the HTTP server. When NestJS instantiates a `@Processor` class, `WorkerHost` creates a BullMQ `Worker` that opens a Redis connection and starts polling — no threads, no child processes. The `concurrency` setting controls how many Promises are in-flight at once, not how many OS threads are used.

Consequence: CPU-intensive processors (e.g. `InvoiceProcessor` rendering a PDF) block the event loop and can slow down HTTP responses while they run.

In production, the fix is a dedicated worker container — a separate Docker service that boots the NestJS app with only processor modules loaded and never starts the HTTP listener. HTTP containers have no `@Processor` classes registered. Both containers share the same Redis, so job handoff is automatic.

The current single-process setup is correct for development — it's simpler to run and reason about.

---

### CSV Import — Worker Thread Pattern

`src/modules/products/csv-import.service.ts`  
`src/modules/products/workers/csv-parser.worker.ts`

A large CSV import (100,000 rows, ~50 MB) does two fundamentally different types of work:

**CPU-bound work** — parsing the CSV text into objects and validating every field. This is pure computation: string splitting, regex checks, type coercion. It runs entirely on the CPU and does not wait for anything.

**I/O-bound work** — writing rows to PostgreSQL. The CPU sits idle most of the time, waiting for the network round-trip to the DB.

Node.js runs JavaScript on a single thread. CPU-bound work on the main thread blocks the event loop: while the CPU is parsing 100,000 rows, no other HTTP requests can be handled. The fix is to move CPU-bound work off the main thread using `worker_threads`.

**What runs in the worker**

The worker receives the CSV buffer, streams it through `csv-parse`, validates each row, and sends back a result object once done:

```typescript
// csv-parser.worker.ts — runs in a separate OS thread
parseAndValidate(buffer).then((result) => parentPort!.postMessage(result));
```

The result is `{ validRows, errors, skipped }`. The main thread never processes individual rows — it only receives the final result.

**What stays on the main thread**

All DB writes stay on the main thread. Prisma holds connection pool state that cannot cross thread boundaries — spawning a worker with a Prisma connection would crash. The main thread receives `validRows` from the worker and batches them into Postgres upserts:

```typescript
// csv-import.service.ts — on the main event loop
for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
  await this.writeBatch(validRows.slice(i, i + BATCH_SIZE));
}
```

**Zero-copy buffer transfer**

Serialising a 50 MB buffer through `JSON.stringify` would copy it into a JSON string, costing time and memory. Instead, the buffer is transferred as an `ArrayBuffer` via `transferList`:

```typescript
const arrayBuffer = (buffer.buffer as ArrayBuffer).slice(
  buffer.byteOffset,
  buffer.byteOffset + buffer.byteLength,
);
new Worker(WORKER_PATH, {
  workerData: { buffer: arrayBuffer },
  transferList: [arrayBuffer], // zero-copy: main thread cannot read it after this
});
```

`transferList` moves ownership of the underlying memory to the worker. No copy is made. The `arrayBuffer` reference on the main thread becomes detached (neutered) after transfer.

**Why not `cluster`?**

`cluster` forks the entire Node.js process, duplicating all memory and re-initialising every module (NestJS DI container, Prisma, Redis connections). It is designed for scaling HTTP throughput across CPU cores — Docker handles that by running multiple container replicas instead. `worker_threads` is lighter: the worker shares memory with the parent process and is created in milliseconds, not seconds.

**The rule of thumb**

Before moving anything to a worker, ask: is this work CPU-bound or I/O-bound?

- CPU-bound (parsing, encryption, image resizing, PDF rendering) → worker thread
- I/O-bound (DB queries, HTTP calls, file reads) → async/await on the main thread is fine

For operations that are both (parse then DB write), split them: worker handles the CPU part, main thread handles the I/O part — exactly the pattern used here.

---

## Key Files

- `src/modules/addresses/addresses.service.ts`
- `src/modules/coupons/coupons.service.ts`
- `src/modules/shipping/shipping.service.ts`
- `src/modules/tax/tax.service.ts`
- `src/modules/reviews/reviews.service.ts`
- `src/modules/stock-alerts/stock-alerts.service.ts`
- `src/modules/returns/returns.service.ts`
- `src/modules/invoices/invoice.service.ts` — enqueues generation, streams PDF or returns 202
- `src/modules/invoices/invoice.processor.ts` — BullMQ consumer, writes PDF to filesystem
- `src/modules/invoices/invoice.utils.ts` — shared path helper
- `src/modules/stock-alerts/stock-alert.processor.ts` — BullMQ consumer, sends stock alert emails
- `src/modules/cart/cart-recovery.processor.ts` — BullMQ consumer, sends abandoned cart emails
- `src/modules/products/csv-import.service.ts` — spawns worker, owns DB writes
- `src/modules/products/workers/csv-parser.worker.ts` — CPU-bound parse + validate
- `src/modules/products/workers/csv-worker.types.ts` — shared interfaces
- `prisma/migrations/20260528000003_phase7_features/migration.sql`
