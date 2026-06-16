# Phase 3.2 — Caching Patterns

**Status:** 🔲 Partial — Negative Caching ✅ done; Request Coalescing ✅ done; Refresh Ahead ✅ done; Stale-While-Revalidate pending; Cache Versioning pending
**Builds on:** [Phase 3.1 — Caching Advanced](./phase-3.1-caching-advanced.md)
**Concept cluster:** Five distinct caching strategies beyond cache-aside and write-through. Each solves a different failure mode — null result stampedes, thundering herd on cache miss, premature expiry, serving stale while refreshing, and safe cache invalidation across deployments.

---

## Negative Caching

**What:** When a DB query returns null (product not found, user not found), cache that null result with a short TTL instead of allowing every subsequent request to hit the DB again.

**Why:** Without negative caching, a burst of requests for a non-existent product ID each independently cache-miss, hit the DB, get null, and return 404 — with nothing cached. The next request does the same. The Bloom filter (Phase 3.1) prevents this for IDs that have never existed; negative caching handles IDs that existed but were deleted, or any transient "not found" state.

**Approach:**
- In `CacheService.getOrSet()`, change the null check so that a sentinel value (`"__NULL__"`) is stored instead of skipping the cache set:

```typescript
const cached = await this.redis.get(key);
if (cached === '__NULL__') throw new NotFoundException();
if (cached !== null) return JSON.parse(cached);

const value = await factory();
if (value === null) {
  await this.redis.set(key, '__NULL__', 'EX', 30); // 30s negative TTL
  throw new NotFoundException();
}
await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
return value;
```

- Use a much shorter TTL for negative entries (30s) vs positive entries (5 min) — stale "not found" is less harmful than stale data, but you still want deleted products to return 404 quickly after re-creation.

**Key files:**
- `apps/backend/src/modules/cache/cache.service.ts` — sentinel value handling in `getOrSet`

---

## Request Coalescing (Singleflight)

**What:** When multiple concurrent requests all miss the cache for the same key simultaneously, let only one of them fetch from the DB and share the result with all waiting callers — instead of all of them hitting the DB independently.

**Why:** Cache stampede (thundering herd) happens when a popular key expires and dozens of concurrent requests all miss at the same moment and pile onto the DB. Phase 3 already prevents this with a Redis mutex lock for the most critical paths. Request coalescing is the in-process equivalent — it collapses concurrent in-flight requests *within a single replica* before they even reach the Redis lock.

**Approach:**
- Maintain a `Map<string, Promise<T>>` (`inflightRequests`) in `CacheService`.
- Before making a DB call, check if a promise is already in flight for that key:

```typescript
async getOrSet<T>(key: string, factory: () => Promise<T>, ttl: number): Promise<T> {
  const cached = await this.redis.get(key);
  if (cached !== null) return JSON.parse(cached);

  if (this.inflight.has(key)) return this.inflight.get(key) as Promise<T>;

  const promise = factory().then(value => {
    this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    this.inflight.delete(key);
    return value;
  });
  this.inflight.set(key, promise);
  return promise;
}
```

- This is an in-process optimization — across replicas, the Redis mutex in Phase 3 still applies.

**Key files:**
- `apps/backend/src/modules/cache/cache.service.ts` — add `inflight: Map<string, Promise<unknown>>` and coalescing logic

---

## Refresh Ahead

**What:** Proactively refresh a cache entry before it expires, based on access frequency, so callers always get a cache hit — even on keys with short TTLs.

**Why:** Cache-aside means the user who happens to request a key just after it expires always pays the DB round-trip. For a small set of extremely hot keys (top-10 products, homepage banner), refresh-ahead pre-emptively re-fetches so the TTL never actually expires from a user's perspective.

**Approach:**
- Track the last-refreshed timestamp alongside the value in Redis (store `{ value, refreshAt }` JSON where `refreshAt = now + TTL * 0.8`).
- On cache hit: if `now > refreshAt`, trigger a background re-fetch (non-blocking `setImmediate`) and return the current (still-valid) value.
- On cache miss: fetch synchronously as normal.
- Apply only to explicitly-designated hot keys (e.g., `products:featured`, `categories:all`) to avoid background refresh noise on every key.

**Key files:**
- `apps/backend/src/modules/cache/cache.service.ts` — add `getOrSetRefreshAhead<T>(key, factory, ttl, refreshThreshold = 0.8)`
- `apps/backend/src/modules/products/products.service.ts` — use refresh-ahead for featured/homepage products

---

## Stale-While-Revalidate

**What:** Serve a stale (expired) cache entry immediately while triggering a background refresh — the user gets an instant response, and the next request after the refresh gets fresh data.

**Why:** Refresh-Ahead pre-empts expiry based on a timer. Stale-While-Revalidate is simpler: it responds with whatever is in the cache (even if expired) and refreshes asynchronously. The trade-off is that the first user after expiry gets stale data; the trade-off accepted is zero latency over perfect freshness for data that changes infrequently (product descriptions, category trees).

**Approach:**
- Store entries with two timestamps: `staleAt` (normal TTL) and `deleteAt` (stale TTL, e.g., 10× normal). After `staleAt`, return the value but fire a background refresh. After `deleteAt`, treat as a real miss.
- In Redis: use two keys — `cache:{key}` (short TTL) and `cache:stale:{key}` (long TTL). On miss of the first key but hit of the stale key, return stale and fire background refresh.

**Approach simplified:**
```typescript
const fresh = await this.redis.get(`cache:${key}`);
if (fresh) return JSON.parse(fresh);

const stale = await this.redis.get(`cache:stale:${key}`);
if (stale) {
  setImmediate(() => this.backgroundRefresh(key, factory, ttl));
  return JSON.parse(stale);
}

// True miss — fetch synchronously
const value = await factory();
await this.redis.set(`cache:${key}`, JSON.stringify(value), 'EX', ttl);
await this.redis.set(`cache:stale:${key}`, JSON.stringify(value), 'EX', ttl * 10);
return value;
```

**Key files:**
- `apps/backend/src/modules/cache/cache.service.ts` — add `getOrSetSWR<T>(key, factory, ttl)`

---

## Cache Versioning

**What:** Prefix all cache keys with a global version number that can be incremented to instantly invalidate every cache entry across all replicas — without iterating keys or waiting for TTLs to expire.

**Why:** Pattern-based invalidation (`SCAN + DEL products:*`) works but is O(n) and can miss keys under load. After a breaking schema migration or a bulk product import, you want to invalidate the entire cache instantly. Cache versioning makes this O(1): change the prefix, all old keys become unreachable immediately.

**Approach:**
- Store the current version in Redis: `cache:version = 42`.
- Prefix all cache keys: `v42:products:id:{id}` instead of `products:id:{id}`.
- `CacheService.buildKey(key)`: `const v = await this.redis.get('cache:version'); return \`v${v}:${key}\``.
- To invalidate everything: `await this.redis.incr('cache:version')`. Old `v42:*` keys become orphans and expire naturally on their TTLs — no DEL sweep needed.
- Cache the version itself in-process with a 1-second TTL to avoid an extra Redis round-trip on every cache operation.

**Key files:**
- `apps/backend/src/modules/cache/cache.service.ts` — add `getVersion()` with in-process cache, update `buildKey()` to include version prefix
- `apps/backend/src/modules/products/products.service.ts` — replace `invalidateProducts()` pattern with `cacheService.bumpVersion()` for full invalidations
