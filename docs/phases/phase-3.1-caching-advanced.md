# Phase 3.1 — Caching Advanced

**Status:** 🔲 Partial — Redis eviction policy ✅ done; write-through, Bloom filter, pub/sub invalidation pending
**Builds on:** [Phase 3 — Caching & Performance](./phase-3-caching.md)
**Concept cluster:** Four gaps in the current cache layer — writes still cause cold misses, Redis will OOM instead of evicting gracefully, non-existent keys hit the DB on every request, and L1 invalidation is local to one process.

See [Phase 3.2](./phase-3.2-caching-patterns.md) for the full taxonomy of caching patterns (Negative Cache, Request Coalescing, Refresh Ahead, Stale-While-Revalidate, Cache Versioning).

---

## Write-Through Cache on Product Mutations

**What:** On every `createProduct` and `updateProduct`, write the new value into Redis immediately — in the same operation — rather than invalidating and waiting for the next read to repopulate.

**Cache-Aside vs Write-Through comparison:**

| | Cache-Aside (current) | Write-Through (this item) |
|---|---|---|
| On write | Invalidate key | Write new value to cache |
| First read after write | Cache miss → DB | Cache hit |
| Consistency | Strong after first read | Strong immediately |
| Complexity | Simple | Slightly more — must keep cache key shape identical to read path |
| Best for | Read-heavy, infrequent writes | Moderate writes where first-reader latency matters |

**Why:** Under the current cache-aside pattern, every mutation (even a minor `isActive` toggle) invalidates the cache key. The first read after every write always pays a full DB round-trip. Write-through eliminates this cold-miss spike without changing the TTL model.

**Approach:**
- In `ProductsService.update()` and `create()`, after the Prisma write, call `cacheService.set(cacheKey, updatedProduct, ttl)` before returning.
- `invalidateProducts()` still runs for list/cursor keys — only single-entity keys (`products:id:{id}`) get a write-through value.
- Existing cache-aside path remains as a fallback for keys that were never written through.

**Key files:**
- `apps/backend/src/modules/products/products.service.ts` — add `cacheService.set` after each mutation
- `apps/backend/src/modules/cache/cache.service.ts` — confirm `set` accepts the same key shape as `get`

---

## Redis `maxmemory-policy allkeys-lru`

**What:** Configure Redis to evict the least-recently-used key when memory is full instead of the default `noeviction` policy, which returns errors on every write once full.

**Why:** Under `noeviction`, a memory-full Redis rejects all write commands — cache sets fail silently and BullMQ job enqueues fail loudly, cascading into dropped jobs and broken features. `allkeys-lru` lets Redis gracefully shed cold cache entries to make room, degrading to more DB reads rather than hard errors.

**Approach:**
- `docker-compose.yml`: add `command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru` to the redis service.
- `k8s/base/infra/` redis deployment: same flags in container args.
- No application code change required.

**Key files:**
- `docker-compose.yml` — redis service command
- `k8s/base/infra/` — redis deployment args

---

## Bloom Filter for Non-Existent Product IDs

**What:** Before hitting the DB on a cache miss for `GET /products/:id`, check a Redis Bloom filter. If the filter confirms the ID definitely does not exist, return 404 immediately without a DB query.

**Why:** Cache miss on an unknown ID triggers a full DB round-trip that returns null → 404. Under ID-enumeration attacks or high volumes of stale deep-links, every unknown ID is wasted DB I/O. A Bloom filter is probabilistic — false negatives are impossible, so a "not present" answer is guaranteed correct. False positives (filter says "maybe exists" for a non-existent ID) fall through to the DB and return 404 normally.

**Note — Bloom filter vs Negative Cache:** These solve overlapping problems differently. A Bloom filter is a compact probabilistic structure that answers "definitely not present" in O(1) with no per-key memory. A negative cache (see Phase 3.2) caches the null result with a short TTL — simpler to implement but uses per-key memory and has a time-bounded staleness window. Use Bloom filter when the non-existent ID space is large and unbounded; use negative cache when you have a bounded set of known-missing keys.

**Approach:**
- Use RedisBloom (`redis/redis-stack` image): `BF.ADD`, `BF.EXISTS`.
- `createProduct` → `BF.ADD products:bloom {id}`.
- For deletions: use Counting Bloom Filter (`CF.*`) which supports removal, or rebuild the filter on a schedule.
- `ProductsService.findOne()`: before cache check, call `BF.EXISTS products:bloom {id}`. If `0`, throw `NotFoundException` immediately.
- Update `docker-compose.yml` to use `redis/redis-stack` instead of plain `redis`.

**Key files:**
- `apps/backend/src/modules/products/products.service.ts` — bloom check in `findOne`
- `apps/backend/src/modules/cache/cache.service.ts` — add `bloomAdd` / `bloomExists` helpers
- `docker-compose.yml` — switch to `redis/redis-stack` image

---

## Redis Pub/Sub for Cross-Replica L1 Cache Invalidation

**What:** When `invalidateProducts()` runs on one backend replica, broadcast a Redis Pub/Sub message so all other replicas also clear their in-process `l1Cache` Map.

**Why:** Each backend replica has its own in-process `l1Cache` (`Map<string, { value, expiry }>`). `invalidateProducts()` calls `this.l1Cache.clear()` — but that only affects the replica that handled the mutation. Other replicas serve stale L1 entries for up to 5 seconds (`L1_TTL_MS`). Users load-balanced to different replicas see different data after a product update.

**Approach:**
- Two ioredis instances per replica: one **publisher** (used for all regular commands) and one **subscriber** (blocked in subscribe mode — a subscriber connection cannot issue other commands).
- On boot: subscriber listens on channel `products:invalidate`.
- Message handler calls `this.l1Cache.clear()`.
- `invalidateProducts()`: after local `l1Cache.clear()`, publish `PUBLISH products:invalidate ''` on the publisher connection.

**Key files:**
- `apps/backend/src/modules/products/products.service.ts` — publish on invalidate, subscribe on init
- `apps/backend/src/modules/cache/cache.service.ts` — expose `subscribe(channel, handler)` helper via dedicated subscriber ioredis instance
- `apps/backend/src/app.module.ts` — register subscriber ioredis as a named provider
