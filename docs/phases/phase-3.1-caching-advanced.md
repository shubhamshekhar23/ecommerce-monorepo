# Phase 3.1 — Caching Advanced

**Status:** 🔲 Pending
**Builds on:** [Phase 3 — Caching & Performance](./phase-3-caching.md)
**Concept cluster:** Four gaps in the current cache layer — writes still cause cold misses, Redis will OOM instead of evicting, non-existent keys hit the DB every time, and L1 invalidation is local to one replica.

---

## Write-Through Cache on Product Mutations

**What:** On every `createProduct` and `updateProduct`, write the new value into Redis immediately (in the same operation) rather than invalidating and relying on the next read to repopulate.

**Why:** The current pattern is cache-aside: mutations call `invalidateProducts()` which deletes the key. The first read after every write is always a cache miss → full DB round-trip. Write-through eliminates this cold-miss spike. Under sustained write traffic every mutation now leaves a warm entry.

**Approach:**
- In `ProductsService.update()` and `create()`, after the Prisma write succeeds, call `cacheService.set(cacheKey, updatedProduct, ttl)` before returning.
- `invalidateProducts()` still runs for list/cursor keys — only single-entity keys (`products:id:{id}`) get a write-through value.
- Existing cache-aside path remains as fallback for keys never written through.

**Key files:**
- `apps/backend/src/modules/products/products.service.ts` — add `cacheService.set` after each mutation
- `apps/backend/src/modules/cache/cache.service.ts` — confirm `set` accepts the same key shape as `get`

---

## Redis `maxmemory-policy allkeys-lru`

**What:** Configure Redis to evict the least-recently-used key when memory is full instead of the default `noeviction`, which returns errors on every write once full.

**Why:** Under `noeviction`, a memory-full Redis rejects all write commands — cache sets fail silently and BullMQ job enqueues fail loudly, cascading into dropped jobs and broken features. `allkeys-lru` lets Redis gracefully shed cold cache entries, degrading to more DB reads rather than hard errors.

**Approach:**
- `docker-compose.yml`: add `command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru` to the redis service.
- `k8s/base/infra/` redis deployment: same flags in container args.
- No application code change.

**Key files:**
- `docker-compose.yml` — redis service command
- `k8s/base/infra/` — redis deployment args

---

## Bloom Filter for Non-Existent Product IDs

**What:** Before hitting the DB on a cache miss for `GET /products/:id`, check a Redis Bloom filter. If the filter confirms the ID definitely does not exist, return 404 immediately without a DB query.

**Why:** Cache miss on an unknown ID triggers a full DB round-trip that returns null → 404. Under ID-enumeration attacks or high volumes of stale links, every unknown ID is wasted DB I/O. A Bloom filter is probabilistic — false negatives are impossible, so "not present" is guaranteed correct.

**Approach:**
- Use RedisBloom (`redis/redis-stack` image includes it): `BF.ADD`, `BF.EXISTS`.
- `createProduct` → `BF.ADD products:bloom {id}`.
- `softDelete` → use Counting Bloom Filter (`CF.*`) which supports removals, or rebuild the filter periodically.
- `ProductsService.findOne()`: before cache check → DB, call `BF.EXISTS products:bloom {id}`. If `0`, throw `NotFoundException` immediately.
- Update `docker-compose.yml` to use `redis/redis-stack` instead of plain `redis`.

**Key files:**
- `apps/backend/src/modules/products/products.service.ts` — add bloom check in `findOne`
- `apps/backend/src/modules/cache/cache.service.ts` — add `bloomAdd` / `bloomExists` helpers
- `docker-compose.yml` — switch to `redis/redis-stack` image

---

## Redis Pub/Sub for Cross-Replica L1 Cache Invalidation

**What:** When `invalidateProducts()` runs on one backend replica, broadcast a Redis Pub/Sub message so all other replicas also clear their in-process `l1Cache` Map.

**Why:** Each backend replica has its own in-process `l1Cache` (a `Map<string, { value, expiry }>`). `invalidateProducts()` calls `this.l1Cache.clear()` — but that only clears the replica that handled the write. Other replicas serve stale L1 entries for up to 5 seconds (the `L1_TTL_MS`), so users routed to different replicas see different data after a product update.

**Approach:**
- Two ioredis instances per replica: one **publisher** (used for all regular commands) and one **subscriber** (blocked in subscribe mode, cannot issue other commands).
- On boot: subscriber listens on channel `products:invalidate`.
- Message handler: `this.l1Cache.clear()`.
- `invalidateProducts()`: after local `l1Cache.clear()`, call `publisher.publish('products:invalidate', '')`.

**Key files:**
- `apps/backend/src/modules/products/products.service.ts` — publish on invalidate, subscribe on init
- `apps/backend/src/modules/cache/cache.service.ts` — expose `subscribe(channel, handler)` helper using a dedicated subscriber connection
- `apps/backend/src/app.module.ts` — register subscriber ioredis instance as a named provider
