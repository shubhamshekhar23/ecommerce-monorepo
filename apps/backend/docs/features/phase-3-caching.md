# Phase 3 — Caching & Performance

**Status:** ✅ Done
**Concept cluster:** Every senior dev has been burned by a cache bug. Know the patterns and their failure modes before you need them in production.

---

## What Was Built

### Cache-Aside (Lazy Loading)

`src/modules/cache/cache.service.ts`

The most common cache pattern — the application manages fetching and invalidation:

```
GET /products/:slug
  1. Check Redis: products:slug:{slug}
  2. Hit  → return cached value immediately
  3. Miss → query Postgres, store in Redis (TTL 5min), return result

PUT /products/:id
  1. Update Postgres
  2. DEL the Redis key (invalidation)
```

Used for product detail pages and category trees. The product list cache is tag-based (see below).

### Tag-Based Cache Invalidation

The category tree is expensive to rebuild — it requires a recursive query. It's cached for 30 minutes. When any category is mutated, the cache is invalidated by tag rather than by knowing every individual key.

Implementation: when caching a value, also add its key to a Redis Set keyed by tag (`cache:tag:categories`). On mutation, fetch all keys from the tag set and delete them all. This keeps invalidation logic in one place even when cached keys change.

### Rate Limiting

`src/modules/rate-limit/` + `src/common/guards/rate-limit.guard.ts`

The `@RateLimit()` decorator is applied at the controller or method level:

```typescript
@RateLimit({ window: 15 * 60, limit: 10, keyStrategy: 'ip' })
@Post('/login')
async login(...) {}
```

Under the hood: each request increments a Redis counter keyed by `(IP or userId):endpoint`. If the counter exceeds the limit within the window, the guard returns 429. The counter TTL equals the window, so it auto-resets.

Two strategies:
- `keyStrategy: 'ip'` — limits by IP address (unauthenticated endpoints like login/register)
- `keyStrategy: 'user'` — limits by userId (authenticated endpoints like order placement)

NestJS Throttler (the library this wraps) uses the same sliding window algorithm.

### Cache Stampede Prevention

When a popular product's cache expires, thousands of concurrent requests all miss and simultaneously query Postgres. This is the cache stampede (also called "thundering herd").

Prevention: use a Redis lock (`SET NX PX`) on cache misses. The first miss acquires the lock, fetches from DB, populates the cache, releases the lock. Other misses wait for the lock with a short sleep, then retry and get a cache hit.

### Redis Data Structures for Business Logic

`src/modules/products/products.service.ts` (bestsellers) and `src/modules/cache/cache.service.ts`:

```typescript
// Sorted Set for bestsellers — score = total units sold
await redis.zincrby('bestsellers:weekly', quantity, `product:${id}`);
const top10 = await redis.zrevrange('bestsellers:weekly', 0, 9);

// Sorted Set for recently viewed — score = timestamp, cap at 20
await redis.zadd(`user:${userId}:viewed`, Date.now(), `product:${id}`);
await redis.zremrangebyrank(`user:${userId}:viewed`, 0, -21);
```

Using the right Redis data structure matters: `ZINCRBY` is O(log N), atomic, and requires zero application logic to maintain sorted order.

---

## Cache Pattern Trade-Offs (Study Notes)

There are 4 cache patterns, each with different consistency trade-offs:

- **Cache-aside** (what we use) — app manages everything; cache can be out of sync if invalidation is missed
- **Read-through** — cache fetches from DB on miss; simpler code but less control
- **Write-through** — write to cache and DB simultaneously; always consistent but doubles write latency
- **Write-behind** — write to cache, async flush to DB; fastest writes but data loss risk if cache crashes

### Redis Eviction Policy Warning

Never run BullMQ and caching on the same Redis instance with `allkeys-lru`. With `allkeys-lru`, Redis can evict ANY key — including pending BullMQ jobs — when memory fills up. Jobs disappear silently.

Correct setup: run a **separate Redis instance** for queues with `noeviction` policy, and a separate one for caching with `allkeys-lru`.

---

## Key Files

- `src/modules/cache/cache.service.ts`
- `src/modules/rate-limit/rate-limit.guard.ts`
- `src/common/guards/rate-limit.guard.ts`
- `src/common/decorators/rate-limit.decorator.ts`
