# Phase 2.1 — Resilience Patterns

**Status:** ✅ Done
**Builds on:** [Phase 2 — Reliability Patterns](./phase-2-reliability.md)
**Concept cluster:** Three additions to the existing resilience layer — isolate dependency failures with Bulkheads so one slow service can't starve others, supplement the sliding-window rate limiter with Token Bucket to allow legitimate bursts, and use Fan-In to make the order saga's success condition explicit rather than optimistic.

---

## Bulkhead Pattern

**What:** Assign separate, bounded resource pools to different dependencies so a slow or failing dependency can only exhaust its own pool — not the one serving product listings or database reads.

**Why:** The current backend shares a single event loop and a single pool of outbound connections for all work. When Stripe's API is slow (common under load), in-flight payment requests accumulate, holding references and delaying the event loop. Product listing requests — which have nothing to do with Stripe — get delayed too. A Bulkhead draws a hard line between workloads.

**The analogy:** A ship's hull is divided into watertight compartments. One breach floods one compartment, not the whole ship. Same principle: one slow dependency floods one pool, not the whole server.

**Approach:**

Separate `ioredis` instances per concern:
```typescript
// In app.module.ts — named providers, not shared
{ provide: 'REDIS_CACHE',      useFactory: () => new Redis(process.env.REDIS_URL) },
{ provide: 'REDIS_RATE_LIMIT', useFactory: () => new Redis(process.env.REDIS_URL) },
{ provide: 'REDIS_PUBSUB',     useFactory: () => new Redis(process.env.REDIS_URL) },
// BullMQ already creates its own connection internally
```

Bounded concurrency on Stripe and external HTTP:
```typescript
import pLimit from 'p-limit';

@Injectable()
export class StripeService {
  private readonly limit = pLimit(10); // max 10 concurrent Stripe calls

  async createPaymentIntent(amount: number): Promise<Stripe.PaymentIntent> {
    return this.limit(() => this.stripe.paymentIntents.create({ amount, currency: 'usd' }));
  }
}
```

Named `http.Agent` with `maxSockets` per third-party domain:
```typescript
import * as https from 'https';

const stripeAgent  = new https.Agent({ maxSockets: 10, keepAlive: true });
const emailAgent   = new https.Agent({ maxSockets: 5,  keepAlive: true });
```

**Trade-offs:**
- Multiple Redis connections increase total connection count — acceptable; each is lightweight
- `p-limit` adds a queue inside the process — requests over the concurrency cap wait rather than fail; tune the limit against your Stripe rate quota
- Does not replace Circuit Breaker — Bulkhead limits concurrency, Circuit Breaker stops calls entirely when failure rate is high; both belong together

**Key files:**
- `apps/backend/src/app.module.ts` — split Redis into named providers
- `apps/backend/src/modules/payments/stripe.service.ts` — add `pLimit` concurrency cap
- `apps/backend/src/modules/cache/cache.service.ts` — inject `REDIS_CACHE` specifically
- `apps/backend/src/modules/rate-limit/rate-limit.service.ts` — inject `REDIS_RATE_LIMIT` specifically
- `apps/backend/package.json` — add `p-limit`

---

## Token Bucket Rate Limiting Algorithm

**What:** A second rate-limiting strategy alongside the existing sliding-window implementation. Tokens refill at a steady rate; each request consumes one token; short bursts are allowed up to the bucket capacity.

**Why the existing sliding window is not always right:** The sliding window treats every request identically regardless of timing. A user who adds 5 items to their cart in 3 seconds gets rate-limited the same as a bot hammering the API at 5 req/sec. Token Bucket allows the burst — the user legitimately needs 5 quick cart operations — while still preventing sustained high-rate abuse.

**Sliding Window vs Token Bucket:**

- Sliding Window: counts requests in a rolling time window; rejects when count exceeds limit; no burst tolerance; good for strict fairness
- Token Bucket: maintains a token balance; each request costs one token; tokens refill at a fixed rate; burst allowed up to bucket size; good for human interaction patterns

**Approach:**

Redis hash per user/key: `{ tokens: <float>, lastRefill: <epoch_ms> }`

Atomic Lua script (must be atomic — read-modify-write cannot be two round-trips):
```lua
local key       = KEYS[1]
local capacity  = tonumber(ARGV[1])  -- max tokens
local refillRate = tonumber(ARGV[2]) -- tokens per second
local now       = tonumber(ARGV[3])  -- current epoch ms
local cost      = tonumber(ARGV[4])  -- tokens this request costs (usually 1)

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens    = tonumber(data[1]) or capacity
local lastRefill = tonumber(data[2]) or now

-- Compute refill
local elapsed = math.max(0, (now - lastRefill) / 1000)
tokens = math.min(capacity, tokens + elapsed * refillRate)

if tokens < cost then
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
  redis.call('EXPIRE', key, 3600)
  return 0  -- denied
end

tokens = tokens - cost
redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
redis.call('EXPIRE', key, 3600)
return 1  -- allowed
```

Add `RATE_LIMIT_ALGORITHM=sliding_window|token_bucket` env var to switch strategies at startup. Both share the same `RateLimitService` interface — callers don't know which algorithm runs underneath.

**Key files:**
- `apps/backend/src/modules/rate-limit/rate-limit.service.ts` — add `checkTokenBucket()` strategy
- `apps/backend/src/modules/rate-limit/token-bucket.lua` — Lua script
- `apps/backend/src/config/` — add `RATE_LIMIT_ALGORITHM` env config

---

## Fan-In Pattern

**What:** Aggregate results from multiple parallel async operations before advancing to the next step — making "all downstream steps completed" an explicit, observable condition rather than a fire-and-forget assumption.

**Why:** After `OrderSagaService` places an order, it currently fires notifications, inventory reservation, and analytics events without waiting for confirmation. If inventory reservation silently fails (e.g., the warehouse service is down), the order is marked `PAID` with inventory not actually reserved. Fan-In makes the saga wait for all critical downstream confirmations within a bounded timeout — failures are logged and surfaced, not silently swallowed.

**Fan-In vs Fan-Out:**
- Fan-Out: one event triggers multiple independent consumers (already done via RabbitMQ Pub/Sub)
- Fan-In: multiple parallel async results are gathered before the workflow proceeds — the aggregation step that pairs with Fan-Out

**Approach:**

```typescript
// In OrderSagaService.runOrderTransaction(), after payment succeeds:
const [warehouse, inventory, analytics] = await Promise.allSettled([
  this.warehouseService.notifyNewOrder(order.id),
  this.inventoryService.reserveStock(order.id, order.items),
  this.analyticsService.publishOrderPlaced(order.id),
]);

// Log any partial failures — don't fail the order, but surface them
for (const [name, result] of [
  ['warehouse', warehouse],
  ['inventory', inventory],
  ['analytics', analytics],
] as const) {
  if (result.status === 'rejected') {
    this.logger.warn(`Fan-in step failed: ${name} — ${result.reason}`);
  }
}

// Inventory reservation is critical — if it failed, compensate
if (inventory.status === 'rejected') {
  await this.compensate(order);
  throw new Error('Inventory reservation failed — order compensated');
}
```

Add a 5-second overall timeout using `Promise.race` against a timeout sentinel so a hung downstream service cannot hold the saga indefinitely.

Emit `FULFILLMENT_STARTED` to `OrderEventStore` before the fan-out, and `FULFILLMENT_CONFIRMED` after all critical steps settle.

**Critical vs non-critical steps:**
- Critical (must succeed): inventory reservation — if this fails, the order must be compensated
- Non-critical (log failures, proceed): warehouse notification, analytics — eventual consistency acceptable

**Key files:**
- `apps/backend/src/modules/orders/saga/order-saga.service.ts` — replace fire-and-forget with `Promise.allSettled` + timeout
- `apps/backend/src/modules/orders/order-event-store.service.ts` — add `FULFILLMENT_STARTED`, `FULFILLMENT_CONFIRMED` event types
