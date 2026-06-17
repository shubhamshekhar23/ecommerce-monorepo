# Phase 9.3 — Microservices: Resilience

**Status:** ✅ Done
**Builds on:** [Phase 9.2 — Microservices: Coordination](./phase-9.2-microservices-coordination.md)
**Concept cluster:** Keeping the system usable when a dependency is down — search falls back to a DB full-text query, and transient payment failures queue a retry instead of immediately cancelling the order.

---

## Graceful Degradation

**What:** Two degradation paths — search falls back to a Postgres full-text query when the search-service is unavailable, and payment failures enqueue a BullMQ retry job rather than immediately failing the order.

**Why:** A down search-service currently returns 502 from the gateway — users cannot search at all. A transient Stripe error currently cancels the order — the customer has to restart checkout. Both are avoidable. Graceful degradation keeps the system usable under partial failure at the cost of reduced quality (slower search, delayed confirmation).

---

### Search Fallback

**Current state:** `ProductsService.search()` calls the search-service via HTTP. If it's down, the call throws and the 502 propagates to the user.

**Approach:**
- Wrap the search-service HTTP call in try/catch.
- On failure, log a warning and fall back to:

```typescript
return this.prisma.product.findMany({
  where: {
    isActive: true,
    deletedAt: null,
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { searchVector: { search: q } }, // Postgres FTS already indexed
    ],
  },
  take: limit,
});
```

- Wire the existing `CircuitBreakerService` into this path: open the circuit after 5 consecutive search-service failures so the fallback activates instantly without waiting for each timeout.
- Add a response header `X-Search-Source: fallback` so the frontend can display "showing approximate results" if needed.

**Key files:**
- `apps/backend/src/modules/products/products.service.ts` — try/catch + fallback query
- `apps/backend/src/modules/circuit-breaker/circuit-breaker.service.ts` — already exists, wire in
- `apps/backend/src/modules/products/products.controller.ts` — optionally set `X-Search-Source` header

---

### Payment Retry Queue

**Current state:** `StripeService` throws on charge failure, the order saga catches it and marks the order CANCELLED.

**Approach:**
- Distinguish retriable errors from non-retriable errors in `StripeService`:
  - **Non-retriable** (card declined, expired, insufficient funds): cancel immediately, notify user.
  - **Retriable** (network error, rate limit, Stripe internal error): enqueue a `payment-retry` BullMQ job.
- `payment-retry` processor:
  - Retries up to 3× with exponential backoff (5s, 25s, 125s).
  - On success: emits `payment.confirmed` event, saga continues.
  - On exhaustion: emits `order.payment.failed`, saga marks order CANCELLED and restores cart.
- The order stays in `PENDING` status during the retry window — the user sees "Payment processing" rather than an immediate failure.

```typescript
// In StripeService
if (isRetriable(error)) {
  await this.paymentRetryQueue.add('retry', { orderId, paymentIntentId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
  });
  return; // don't throw — order stays PENDING
}
throw error; // non-retriable — saga will cancel
```

**Key files:**
- `apps/backend/src/modules/stripe/stripe.service.ts` — classify errors, enqueue retry
- `apps/backend/src/modules/payments/payment-retry.processor.ts` — new BullMQ processor
- `apps/backend/src/modules/payments/payments.module.ts` — register queue
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — handle `order.payment.failed` event
