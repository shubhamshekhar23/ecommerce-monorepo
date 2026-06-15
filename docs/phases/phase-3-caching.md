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

Used for product detail pages and order read models.

#### Pattern-Based Cache Invalidation

When a product is mutated, all related cache entries are swept using a Redis SCAN with a glob pattern:

```typescript
await cache.invalidateByPattern('products:*');
```

SCAN is used instead of `KEYS *` to avoid blocking the Redis event loop on large keyspaces — it iterates the keyspace in chunks of 100 keys per call.

#### Cache Stampede Prevention

When a popular key expires, all concurrent requests miss simultaneously and pile onto the database. This is the cache stampede (thundering herd).

Prevention via a Redis mutex lock in `CacheService.getOrSet`:

```
1. get(key)                    → miss
2. SET lock:key token NX PX 5000  → only one caller gets 'OK'
3. winner: re-check get(key), fetch DB, set cache, release lock
4. losers: poll every 50ms up to 10 times waiting for the winner
5. if lock expires before winner finishes → fall back to direct DB fetch
```

Key details:

- `NX` (set-if-not-exists) makes the lock acquisition atomic — no race between check and set
- `PX 5000` auto-expires the lock after 5 s so a crashed process can't hold it forever
- Lock release uses a Lua script that checks the caller's token before deleting, so a slow caller can't accidentally release a lock acquired by someone else
- The re-check after acquiring the lock (double-checked locking) handles the case where the previous winner finished while we were waiting for the lock

All callers of `withCache` in `ProductsService` get stampede protection automatically — no changes needed at call sites.

---

### Rate Limiting

`src/modules/rate-limit/`

The `@RateLimit()` decorator is applied at the controller or method level:

```typescript
@RateLimit({ windowMs: 15 * 60 * 1000, limit: 10, keyStrategy: 'ip' })
@Post('/login')
async login(...) {}
```

Under the hood: a Redis sorted set per bucket key holds timestamps of past requests. On each request, expired entries are pruned, the current timestamp is added, and the count is compared against the limit. If over the limit, the guard returns 429.

A Lua script makes the three Redis operations (ZREMRANGEBYSCORE + ZADD + ZCARD) atomic — without it, concurrent requests could read a stale count between operations.

Three key strategies:

- `keyStrategy: 'ip'` — one bucket per client IP (unauthenticated endpoints like login/register)
- `keyStrategy: 'user'` — one bucket per authenticated user across all routes
- `keyStrategy: 'user-per-route'` — one bucket per user per endpoint (most granular)

#### Why Sliding Window Over Fixed Window

Fixed window resets at wall-clock boundaries (e.g. every minute at :00). A burst of 10 requests at :59 and 10 more at :01 = 20 in 2 seconds, but both pass a limit-10 fixed window. Sliding window counts only the rolling last `windowMs` — no boundary attack possible.

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

## Cache Metrics

`src/modules/cache/cache.service.ts` + `src/modules/cache/cache.module.ts`

Every `cache.get()` call increments a `cache_operations_total` Prometheus counter:

```
cache_operations_total{result="hit",  namespace="products"} 142
cache_operations_total{result="miss", namespace="products"}  31
```

The `namespace` label is derived from the first segment of the cache key (`products:detail:id:abc` → `products`), so no call sites need to pass anything extra.

**PromQL to compute hit rate per namespace:**

```promql
rate(cache_operations_total{result="hit"}[5m])
/
rate(cache_operations_total[5m])
```

A drop below ~70% on `products` means either invalidation is too aggressive or a stampede is happening.

---

## Key Files

- `src/modules/cache/redis.service.ts` — Redis connection management
- `src/modules/cache/cache.service.ts` — cache-aside logic (get/set/del/invalidateByPattern/getOrSet with stampede lock)
- `src/modules/cache/cache.module.ts` — global module, exports both services
- `src/modules/rate-limit/rate-limiter.service.ts` — sliding window Lua script
- `src/modules/rate-limit/rate-limit.guard.ts` — canActivate + key strategy
- `src/modules/rate-limit/rate-limit.decorator.ts` — @RateLimit() decorator

---

## Phase 3 Backfill (2026-06-15)

### Hot Redis Key — L1 In-Memory Cache

**Problem:** During a flash sale, the first page of products (`products:cursor:20:`) gets hit thousands of times per second. The stampede lock in `CacheService.getOrSet` prevents DB thundering-herd, but every single request still pays a Redis network round-trip (~0.5–2 ms). At 5,000 req/s that's 2,500–10,000 ms of cumulative Redis I/O per second — a recognised "hot key" bottleneck.

**Fix:** Added an in-process L1 cache (`Map<string, { value, expiry }>`) inside `ProductsService` that sits above the Redis layer.

```
request → L1 Map (5 s TTL, ~0 ms) → Redis (60 s TTL, ~1 ms) → PostgreSQL
```

- On L1 hit: return immediately, zero network cost.
- On L1 miss: fall through to `CacheService.getOrSet` (Redis + stampede lock), then populate L1 with the result.
- On any write (`invalidateProducts`): `l1Cache.clear()` is called before the Redis `SCAN DEL`, so stale data is evicted immediately.

**Key design decisions:**
- TTL is 5 s (not 60 s like Redis) — short enough that a product update is visible to users within 5 s without needing cross-replica cache invalidation (L1 is per-process).
- `l1Cache.clear()` on invalidation rather than key-specific delete — simpler and correct; the Map is small and the cost is negligible.
- No size cap — the number of distinct product list cache keys is bounded by distinct cursor values in real traffic, which is small.

**Trade-off:** In a 3-replica deployment, after a product update, each replica flushes its own L1 independently. For up to 5 s, a user could be routed to a replica that still has old data in L1. This is acceptable for a product catalogue — it is not acceptable for stock levels or order state (which are never L1-cached).

**File:** `apps/backend/src/modules/products/products.service.ts` — `l1Cache`, `getL1`, `setL1`, `withHotCache`, updated `invalidateProducts`
