# Phase 7 — Application Feature Backfill

Completeness gaps in existing business features. No infrastructure dependencies — these can be picked up immediately.

---

## Reviews

### Wire Product Listings To `ProductRating`

**What:** Include `avgRating` and `reviewCount` from `ProductRating` in product list/detail/search responses.

**Current state:** The reviews module maintains `ProductRating` but product queries and DTOs do not consume it. Product responses expose no rating fields — the CQRS read model is not used by product listings.

- Join or include `ProductRating` in product list/detail/search queries
- Extend `ProductResponseDto` and `ProductSearchResponseDto` with `avgRating` and `reviewCount`
- Map those fields in `ProductsService.mapToResponse(...)` and the search response builder

**References:** `apps/backend/src/modules/products/products.service.ts`, `apps/backend/src/modules/products/dto/product-response.dto.ts`, `apps/backend/src/modules/reviews/reviews.service.ts`

---

### Keep `ProductRating` In Sync On Review Rejection

**What:** Recompute the materialized aggregate when an approved review is later rejected.

**Current state:** Approving a review recomputes `ProductRating`, but rejecting an already-approved review only updates the status — `avgRating` and `reviewCount` go stale.

- Recompute the aggregate inside `rejectReview(...)` when the prior status was `APPROVED`
- Add tests covering approve → reject transitions and aggregate updates

**References:** `apps/backend/src/modules/reviews/reviews.service.ts`, `apps/backend/src/modules/reviews/reviews.handler.ts`

---

### Enforce Review Moderation State Transitions

**What:** Restrict moderation actions to the valid lifecycle: `PENDING → APPROVED/REJECTED` only.

**Current state:** `approveReview(...)` and `rejectReview(...)` update by id without validating current status — double-approve and approve-after-reject are currently possible.

- Add current-state checks before moderation updates
- Return `BadRequestException` for invalid transitions
- Add tests for double-approve, double-reject, and approve-after-reject cases

**References:** `apps/backend/src/modules/reviews/reviews.service.ts`

---

## Tax

### Complete Tax Engine Rules And Checkout Integration

**What:** Finish the tax rules engine and wire it into order creation so `taxAmount` is actually populated on `Order`.

**Current state:** `TaxService` exists but only evaluates a small hard-coded rule set. `TaxContext` has no product category or user-type inputs. The service is not connected to cart, checkout, or order totals.

- Extend `TaxContext` to include product category and user type
- Add rule definitions for those dimensions with explicit first-match priority
- Integrate `TaxService.calculate(...)` into checkout/order creation
- Expose subtotal, tax, and total fields consistently in order responses
- Add tests covering rule precedence and order total calculation

**References:** `apps/backend/src/modules/tax/tax.service.ts`, `apps/backend/src/modules/orders/saga/order-saga.service.ts`

---

## Stock Alerts

### Align Back-in-Stock Alerts With Variant-Level Subscriptions

**What:** Move stock alert subscriptions from product-level to variant-level so users only get notified for the exact size/colour they wanted.

**Current state:** Schema, controller, and service all work with `productId` only — any variant restock notifies all product subscribers regardless of which variant they wanted.

- Add `variantId` to the `StockAlert` model and update uniqueness constraints
- Update the API shape from product-level to variant-level subscription
- Emit variant-specific restock payloads from `VariantsService`
- Filter fan-out queries by `variantId`

**References:** `apps/backend/prisma/schema.prisma`, `apps/backend/src/modules/stock-alerts/`, `apps/backend/src/modules/products/variants/variants.service.ts`

---

### Mark Stock Alerts Notified On Successful Delivery

**What:** Move `StockAlert.notified = true` to after successful email delivery, not after enqueue.

**Current state:** `handleRestock(...)` marks all alerts notified immediately after enqueue. If a job exhausts retries, the DB still says the user was notified.

- Remove the immediate bulk `updateMany(...)` after enqueue
- Mark the specific alert notified from the processor after a successful send
- Add tests covering enqueue success with downstream delivery failure

**References:** `apps/backend/src/modules/stock-alerts/stock-alerts.service.ts`, `apps/backend/src/modules/stock-alerts/stock-alert.processor.ts`

---

## Returns

### Wire `APPROVED → REFUNDED` Into The Actual Returns Flow

**What:** Add the missing admin endpoint that triggers `processRefund(...)` so the full state machine is reachable.

**Current state:** `ReturnsService.processRefund(...)` exists but no controller route calls it — `APPROVED → REFUNDED` is unreachable at runtime.

- Add an admin refund-processing endpoint
- Inject and use `StripeService` for the actual refund call
- Decide whether refund processing is synchronous, queued, or outbox-driven
- Add tests covering the full `APPROVED → REFUNDED` path

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/returns/returns.controller.ts`

---

### Restock The Correct Variant On Refund

**What:** Restock only the specific purchased variant, not every variant under the same product.

**Current state:** `processRefund(...)` uses `productId` with `productVariant.updateMany(...)` — incorrectly increments stock for all variants of a product.

- Persist or derive the correct `variantId` from the returned `OrderItem`
- Update only that specific variant during refund restocking
- Add tests covering multi-variant products

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/orders/saga/order-saga.service.ts`

---

### Enforce Return State Transitions And Audit Logging

**What:** Validate state transitions and write `AuditLog` entries on every return status change.

**Current state:** `approve(...)` and `reject(...)` update statuses without checking current state. `AuditService` is never called from the returns service.

- Add current-state checks: valid graph is `PENDING → APPROVED → REFUNDED` and `PENDING → REJECTED`
- Inject `AuditService` and log each transition with before/after status
- Add tests for invalid transitions and audit-log side effects

**References:** `apps/backend/src/modules/returns/returns.service.ts`, `apps/backend/src/modules/audit/audit.service.ts`

---

## Vendor Marketplace

### Build Vendor Ownership Flows On Top Of The Prepared Schema

**What:** Implement the application-layer vendor marketplace behavior using the already-prepared `VENDOR` role and `Product.vendorId` schema.

**Current state:** Schema is ready (`User.role` includes `VENDOR`, `Product.vendorId` exists and is indexed) but no product creation or management flow assigns or enforces vendor ownership.

- Define vendor onboarding and role-assignment flow
- Assign `vendorId` during product creation
- Add vendor-scoped product CRUD so vendors can only manage their own products
- Ensure admin flows can still manage cross-vendor data intentionally
- Add tests covering vendor isolation

**References:** `apps/backend/prisma/schema.prisma`, `apps/backend/src/modules/prisma/prisma.service.ts`
