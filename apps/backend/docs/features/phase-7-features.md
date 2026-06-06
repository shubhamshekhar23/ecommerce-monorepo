# Phase 7 — Core Feature Backfill

**Status:** ✅ Done
**Concept cluster:** Each feature is a pattern exercise. The business feature is the vehicle; the pattern is the lesson.

Migration: `prisma/migrations/20260528000003_phase7_features/migration.sql`

---

## What Was Built

### Address Management — Snapshot Pattern

`src/modules/addresses/`

Users can save multiple shipping addresses. The important lesson is in how addresses relate to orders.

A naïve approach stores `Order.shippingAddressId` as a FK. If the user later edits their address, the order history shows the *updated* address — not the one they actually shipped to. This is wrong for receipts, invoices, and fraud disputes.

The correct approach: `Order.shippingAddress` is a **JSONB column** — a snapshot of the address taken at checkout time:

```json
{
  "firstName": "John", "lastName": "Doe",
  "line1": "123 Main St", "city": "New York",
  "state": "NY", "postalCode": "10001", "country": "US"
}
```

The FK relationship is used only to *populate* the snapshot at order creation. After that, the order is immutable even if the user changes their address 10 times. The `addresses` table still exists for the "saved addresses" feature — it just doesn't drive historical order data.

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

### Tax Engine — Rules Engine Pattern

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

Users can subscribe to a product variant. When stock is replenished (admin updates stock or a return is approved), one event fans out to all subscribers:

```
1 StockReplenished event
  → Load all StockAlert rows for this product
  → Emit N individual email jobs (one per subscriber)
  → Mark each StockAlert.notified = true
```

The fan-out is intentionally async (via BullMQ) so restocking 10,000 subscribers does not block the HTTP response.

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

`src/modules/invoices/invoices.service.ts`

PDF generation is CPU-intensive (pdfkit renders fonts, lays out tables). It should never block an HTTP response.

`GET /api/invoices/:orderId` enqueues a BullMQ job and returns a 202 Accepted with a job ID. The job generates the PDF and stores it. The client polls `GET /api/invoices/:orderId/status` until ready, then downloads.

This is the pattern for any slow operation (report generation, CSV export, image resizing): always move it off the HTTP thread.

### Vendor Schema Preparation

`prisma/schema.prisma` — `User.role` includes `VENDOR` and `Product.vendorId` is a nullable FK.

This is an **expand step** in the expand-contract pattern: the schema supports vendor data now even though the full vendor marketplace features are not built yet. Existing records have `vendorId = null` (B2C model). When marketplace features are built, the column is already there and indexed, migration costs nothing.

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
parseAndValidate(buffer)
  .then((result) => parentPort!.postMessage(result))
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
  transferList: [arrayBuffer],   // zero-copy: main thread cannot read it after this
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
- `src/modules/invoices/invoices.service.ts`
- `src/modules/products/csv-import.service.ts` — spawns worker, owns DB writes
- `src/modules/products/workers/csv-parser.worker.ts` — CPU-bound parse + validate
- `src/modules/products/workers/csv-worker.types.ts` — shared interfaces
- `prisma/migrations/20260528000003_phase7_features/migration.sql`
