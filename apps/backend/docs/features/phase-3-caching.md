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

### Pattern-Based Cache Invalidation

When a product is mutated, all related cache entries are swept using a Redis SCAN with a glob pattern:

```typescript
await cache.invalidateByPattern('products:*');
```

SCAN is used instead of `KEYS *` to avoid blocking the Redis event loop on large keyspaces — it iterates the keyspace in chunks of 100 keys per call.

### Cache Stampede Prevention

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

### Why Sliding Window Over Fixed Window

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
