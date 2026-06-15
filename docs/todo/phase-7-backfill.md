# Phase 7 — Application Feature Backfill

Completeness gaps in existing business features. No infrastructure dependencies — these can be picked up immediately.

## Implementation Order

Items are ordered to front-load schema migrations so client regeneration is done before code changes that depend on new fields.

- Step 1 — Prisma migrations (blocks Items 5 and 7)
- Step 2 — Small isolated fixes: Items 3, 2, 8
- Step 3 — Medium returns fixes: Items 6, 4, 5
- Step 4 — DTO and response: Item 1
- Step 5 — Schema-dependent stock alerts: Item 7
- Step 6 — Integration work: Items 9, 10

---

## Prisma Migrations (Do These First)

### Migration A — `OrderItem.variantId`

Required by Item 5 (fix variant restocking on refund).

`apps/backend/prisma/schema.prisma` — add to `OrderItem` model:

```
variantId  String?
variant    ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
@@index([variantId])
```

Also add reverse relation to `ProductVariant`: `orderItems OrderItem[]`

### Migration B — `StockAlert.variantId`

Required by Item 7 (variant-level stock alert subscriptions).

`apps/backend/prisma/schema.prisma` — add to `StockAlert` model:

```
variantId  String?
variant    ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Cascade)
```

Change unique constraint from `@@unique([productId, userId])` to `@@unique([productId, variantId, userId])`. The old index must be dropped in the migration SQL — write it carefully. Also add `@@index([variantId, notified])`.

Add reverse relation to `ProductVariant`: `stockAlerts StockAlert[]`

---

## Reviews

### 1. Wire Product Listings To `ProductRating`

**What:** Include `avgRating` and `reviewCount` from `ProductRating` in product list/detail/search responses.

**Current state:** The reviews module maintains `ProductRating` but product queries and DTOs do not consume it. Product responses expose no rating fields.

**How to implement:**

`apps/backend/src/modules/products/dto/product-response.dto.ts`
- Add `avgRating: number | null` and `reviewCount: number` fields to `ProductResponseDto` (after line 68)
- Add the same fields to `ProductSearchResponseDto` (after line 101)

`apps/backend/src/modules/products/products.service.ts`
- Extend `ProductForResponse` interface (lines 55–67) to include the optional `rating` field
- Add `rating: true` to the `include` block in `findAllCursor` (line 203), `runFindAll` (line 346), `fetchById` (line 414), and `fetchBySlug` (line 429)
- In `mapToResponse` (line 476) add: `avgRating: product.rating ? Number(product.rating.avgRating) : null` and `reviewCount: product.rating?.reviewCount ?? 0`
- In `runSearch` (line 237, uses raw SQL) — add `LEFT JOIN "ProductRating" pr ON pr."productId" = p.id`, include `pr."avgRating"` and `pr."reviewCount"` in SELECT, extend `ProductFtsRow` interface, populate the fields in the items map

Note: Do NOT push rating into OpenSearch. The backend FTS path already hits Postgres, so the JOIN there is sufficient. OpenSearch stays lean.

**References:** `apps/backend/src/modules/products/products.service.ts`, `apps/backend/src/modules/products/dto/product-response.dto.ts`

---

### 2. Keep `ProductRating` In Sync On Review Rejection

**What:** Recompute the materialized aggregate when an approved review is later rejected.

**Current state:** Approving a review recomputes `ProductRating`, but rejecting an already-approved review only updates the status — `avgRating` and `reviewCount` go stale.

**How to implement:**

`apps/backend/src/modules/reviews/reviews.service.ts`
- Add export: `export const REVIEW_REJECTED_EVENT = 'review.rejected'`
- Rewrite `rejectReview` to: (1) fetch the review first to read current `status`, (2) update status to `REJECTED`, (3) if the fetched status was `APPROVED`, emit `REVIEW_REJECTED_EVENT` with `{ productId: review.productId }`

`apps/backend/src/modules/reviews/reviews.handler.ts`
- Add `@OnEvent(REVIEW_REJECTED_EVENT)` handler `handleReviewRejected` that calls `this.reviewsService.recomputeRating(payload.productId)`

**References:** `apps/backend/src/modules/reviews/reviews.service.ts`, `apps/backend/src/modules/reviews/reviews.handler.ts`

---

### 3. Enforce Review Moderation State Transitions

**What:** Restrict moderation actions to the valid lifecycle: `PENDING → APPROVED/REJECTED` only.

**Current state:** `approveReview(...)` and `rejectReview(...)` update by id without validating current status — double-approve and approve-after-reject are currently possible.

**Valid transitions:**
- `PENDING → APPROVED`
- `PENDING → REJECTED`
- Any other → `BadRequestException`

**How to implement:**

`apps/backend/src/modules/reviews/reviews.service.ts`
- Rewrite `approveReview` (lines 34–42): `findUnique` first (throw `NotFoundException` if missing), check `review.status !== 'PENDING'` (throw `BadRequestException('Review is not in PENDING status')`), then proceed with update and event
- Rewrite `rejectReview` with the same guard pattern (the pre-fetch also satisfies Item 2's requirement)

**References:** `apps/backend/src/modules/reviews/reviews.service.ts`

---

## Tax

### 9. Complete Tax Engine Rules And Checkout Integration

**What:** Finish the tax rules engine and wire it into order creation so `taxAmount` is actually populated on `Order`.

**Current state:** `TaxService` exists but only evaluates a small hard-coded rule set. `TaxContext` has no product category or user-type inputs. The service is not connected to cart, checkout, or order totals.

**How to implement (sub-task A — extend TaxContext):**

`apps/backend/src/modules/tax/tax.service.ts`
- Add `productCategoryId?: string` and `isExempt?: boolean` (user-type exemption) to the `TaxContext` interface (line 12)
- Add example rules for category-based exemptions

**How to implement (sub-task B — wire into order creation):**

`apps/backend/src/modules/orders/saga/order-saga.service.ts`
- Inject `TaxService` into the constructor
- In `createOrderRecord` (line 125), after computing `subtotal`, call `taxService.calculate({ country, state, subtotal })`
- Update `loadUser` (line 264) to also select `state` from user's default address
- Pass `state` through `runOrderTransaction` → `createOrderRecord`
- Store `taxAmount: taxResult.amount` and `subtotal` in `tx.order.create`
- Update `totalPrice: subtotal + shipping.cost + taxResult.amount`
- Extract a private `calculateOrderTax(subtotal, country, state)` helper to keep the method under 20 lines (the file already has `eslint-disable max-lines`)

`apps/backend/src/modules/orders/orders.module.ts`
- Add `TaxModule` to `imports`

**References:** `apps/backend/src/modules/tax/tax.service.ts`, `apps/backend/src/modules/orders/saga/order-saga.service.ts`

---

## Stock Alerts

### 7. Align Back-in-Stock Alerts With Variant-Level Subscriptions

**What:** Move stock alert subscriptions from product-level to variant-level so users only get notified for the exact size/colour they wanted.

**Current state:** Schema, controller, and service all work with `productId` only — any variant restock notifies all product subscribers regardless of which variant they wanted.

**Requires:** Migration B above (`StockAlert.variantId`).

**How to implement:**

`apps/backend/src/modules/stock-alerts/stock-alerts.controller.ts`
- Add optional `variantId?: string` to `SubscribeDto`

`apps/backend/src/modules/stock-alerts/stock-alerts.service.ts`
- `subscribe(userId, productId, email, variantId?: string)` — update `upsert` where clause to use the new composite unique key `{ productId_variantId_userId: { productId, variantId: variantId ?? null, userId } }`
- `unsubscribe(userId, productId, variantId?: string)` — use `deleteMany` with the appropriate filter
- `handleRestock` — update the Prisma query to `where: { productId, variantId: payload.variantId ?? null, notified: false }` so both product-level (null variantId) and variant-level alerts are handled

`apps/backend/src/modules/products/variants/variants.service.ts`
- In the restock event emit (line 105), change payload to include `variantId`: `{ productId, variantId, productName }`

**References:** `apps/backend/prisma/schema.prisma`, `apps/backend/src/modules/stock-alerts/`, `apps/backend/src/modules/products/variants/variants.service.ts`

---

### 8. Mark Stock Alerts Notified On Successful Delivery

**What:** Move `StockAlert.notified = true` to after successful email delivery, not after enqueue.

**Current state:** `handleRestock(...)` marks all alerts notified immediately after enqueue. If a job exhausts retries, the DB still says the user was notified.

**How to implement:**

`apps/backend/src/modules/stock-alerts/stock-alerts.service.ts`
- Remove the `updateMany({ data: { notified: true } })` bulk mark block that runs after enqueue (lines 57–60)

`apps/backend/src/modules/stock-alerts/stock-alert.processor.ts`
- Inject `PrismaService` into the constructor (`PrismaModule` is already imported in `StockAlertsModule`)
- After the successful `mailService.sendStockAlertEmail(...)` call, add: `await this.prisma.stockAlert.update({ where: { id: job.data.alertId }, data: { notified: true } })`
- `alertId` is already in `StockAlertJobData` — no job data shape changes needed

**How failure handling improves:** BullMQ retries on any thrown exception. Since the `notified` update is now after the email send, a failed delivery leaves the alert unnotified and BullMQ retries it automatically.

**References:** `apps/backend/src/modules/stock-alerts/stock-alerts.service.ts`, `apps/backend/src/modules/stock-alerts/stock-alert.processor.ts`

---

## Returns

### 4. Wire `APPROVED → REFUNDED` Into The Actual Returns Flow

**What:** Add the missing admin endpoint that triggers `processRefund(...)` so the full state machine is reachable.

**Current state:** `ReturnsService.processRefund(...)` exists but no controller route calls it — `APPROVED → REFUNDED` is unreachable at runtime.

**How to implement:**

`apps/backend/src/modules/returns/returns.service.ts`
- Inject `StripeService` directly into the constructor (instead of passing it as a parameter)
- Remove the `stripeService` parameter from `processRefund`; call `this.stripeService.createRefund(...)` directly

`apps/backend/src/modules/returns/returns.controller.ts`
- Add `@Patch(':id/refund')` route with `@Roles(UserRole.ADMIN)`
- Call `this.returnsService.processRefund(id)` (no stripe arg needed after service refactor above)

`apps/backend/src/modules/returns/returns.module.ts`
- Add `StripeModule` to `imports` so `StripeService` can be injected

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/returns/returns.controller.ts`

---

### 5. Restock The Correct Variant On Refund

**What:** Restock only the specific purchased variant, not every variant under the same product.

**Current state:** `processRefund(...)` uses `productId` with `productVariant.updateMany(...)` — incorrectly increments stock for all variants of a product.

**Requires:** Migration A above (`OrderItem.variantId`).

**How to implement:**

`apps/backend/src/modules/orders/saga/order-saga.service.ts`
- In `createOrderRecord` (line 125), extend the `createMany.data` map to include `variantId: item.variantId` (cart items already carry `variantId`) — this persists the specific variant on new order items

`apps/backend/src/modules/returns/returns.service.ts`
- Update the `findUnique` include to fetch `orderItem.variantId`
- Replace `productVariant.updateMany({ where: { productId: ... } })` with `productVariant.update({ where: { id: orderItem.variantId } })` — use singular `update` by PK
- Add a guard: if `orderItem.variantId` is null (legacy order pre-migration), fall back to the old `updateMany` with a warning log

Side note: The same `updateMany` bug pattern exists in `orders.service.ts` (`cancelOrder`) and `order-saga.service.ts` (`compensate`). These are separate follow-up items.

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/orders/saga/order-saga.service.ts`

---

### 6. Enforce Return State Transitions And Audit Logging

**What:** Validate state transitions and write `AuditLog` entries on every return status change.

**Current state:** `approve(...)` and `reject(...)` update statuses without checking current state. `AuditService` is never called from the returns service.

**Valid transitions:**
- `PENDING → APPROVED`
- `PENDING → REJECTED`
- `APPROVED → REFUNDED` (in `processRefund`)

**How to implement:**

`apps/backend/src/modules/returns/returns.service.ts`
- Inject `AuditService` into the constructor
- Rewrite `approve` (line 56): `findUnique` first, guard `status !== PENDING` → `BadRequestException`, update, then call `auditService.log({ action: 'RETURN_APPROVED', entity: 'ReturnRequest', entityId, before: { status: 'PENDING' }, after: { status: 'APPROVED' } })`
- Rewrite `reject` with the same guard + audit pattern

`apps/backend/src/modules/returns/returns.module.ts`
- Add `AuditModule` to `imports` (it is not global, so it must be imported here)

Note: `returns.service.ts` is currently 122 lines. After guards and audit calls it will approach the 200-line ESLint limit. Extract `buildRestockOperations(returnRequest)` as a private helper if needed to stay under the limit.

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/audit/audit.service.ts`

---

## Vendor Marketplace

### 10. Build Vendor Ownership Flows On Top Of The Prepared Schema

**What:** Implement the application-layer vendor marketplace behavior using the already-prepared `VENDOR` role and `Product.vendorId` schema.

**Current state:** Schema is ready (`User.role` includes `VENDOR`, `Product.vendorId` exists and is indexed) but no product creation or management flow assigns or enforces vendor ownership.

**How to implement:**

`apps/backend/src/modules/products/products.controller.ts`
- Change `@Roles(UserRole.ADMIN)` on `POST /products` to `@Roles(UserRole.ADMIN, UserRole.VENDOR)`
- Accept `@CurrentUser() user: RequestUser` in the `create` handler and pass `user.id` and `user.role` to the service

`apps/backend/src/modules/products/products.service.ts`
- In `create` (line 102), accept `actorId: string, actorRole: UserRole` parameters
- When `actorRole === UserRole.VENDOR`, set `vendorId: actorId` in the `prisma.product.create` data block
- In `update` (line 147) and `softDelete` (line 459) — after `findUnique`, check: if `product.vendorId !== null && product.vendorId !== actorId`, throw `ForbiddenException`. Admin role bypasses this check.

Vendor read isolation:
- Create `apps/backend/src/common/guards/vendor.guard.ts` — a guard that checks product ownership on mutating routes, following the existing `Roles` decorator pattern. This centralizes the ownership check rather than duplicating it in each service method.

**References:** `apps/backend/prisma/schema.prisma`, `apps/backend/src/modules/products/products.service.ts`, `apps/backend/src/modules/products/products.controller.ts`

---

## Cross-Cutting Concerns

- `returns.service.ts` (currently 122 lines) will approach the 200-line ESLint limit after Items 5, 6 changes. Extract `buildRestockOperations` as a private helper
- `order-saga.service.ts` already has `eslint-disable max-lines` and is 293 lines. Extract a private helper for tax calculation (Item 9)
- Items 1 and 10 both affect product responses. Cache invalidation already calls `cache.invalidateByPattern('products:*')` in `create` and `update` — no extra invalidation needed
- Side effect: the same `updateMany` variant restock bug exists in `orders.service.ts` (`cancelOrder`) and `order-saga.service.ts` (`compensate`). Tag these as follow-up to Item 5
