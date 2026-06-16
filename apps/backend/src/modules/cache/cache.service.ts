import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { RedisService } from './redis.service';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';

const LOCK_TTL_MS = 5000;
const LOCK_RETRY_MS = 50;
const LOCK_MAX_RETRIES = 10;
const NEGATIVE_SENTINEL = '__NULL__';
const NEGATIVE_TTL_S = 30;

/*
 - Atomically releases a lock only if the caller still owns it (token matches).
 - Without this, a slow lock-holder could release a lock acquired by a later caller.
 */
const RELEASE_LOCK_LUA = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  /*
   - In-process singleflight map: concurrent cache misses on the same key within one replica
   - share one DB promise instead of each creating a separate fetch.
   */
  private readonly inflight = new Map<string, Promise<unknown>>();
  /*
   - In-process version cache: avoids a Redis round-trip on every cache op.
   - Refreshed from Redis when expired (1 s TTL).
   */
  private versionCache: { v: number; expiresAt: number } | null = null;

  constructor(
    private readonly redis: RedisService,
    @InjectMetric('cache_operations_total') private readonly cacheOps: Counter<string>,
    @InjectMetric('redis_client_duration') private readonly redisDuration: Histogram<string>,
  ) {}

  /*
   - Reads the global cache version from Redis (lazy) with a 1-second in-process TTL.
   - Default is 0 so the first INCR via bumpVersion creates version 1, making v0:* orphans.
   */
  private async getVersion(): Promise<number> {
    if (this.versionCache && Date.now() < this.versionCache.expiresAt) {
      return this.versionCache.v;
    }
    const raw = await this.redis.getClient().get('cache:version');
    const v = raw ? parseInt(raw, 10) : 0;
    this.versionCache = { v, expiresAt: Date.now() + 1000 };
    return v;
  }

  private async buildKey(key: string): Promise<string> {
    const v = await this.getVersion();
    return `v${v}:${key}`;
  }

  /*
   - Bumps the global version so all existing versioned keys become unreachable orphans.
   - Old keys expire naturally on their TTLs — no SCAN + DEL sweep required.
   */
  async bumpVersion(): Promise<void> {
    await this.redis.getClient().incr('cache:version');
    this.versionCache = null;
  }

  async get<T>(key: string): Promise<T | null> {
    /*
     - S4: always returns null — 100% cache miss rate, every request hits PostgreSQL.
     - Signal: cache_misses_total equals http request rate; Jaeger every span has a DB child.
    */
    if (isBugScenario(4)) return null;

    const vKey = await this.buildKey(key);
    const start = Date.now();
    try {
      const raw = await this.redis.getClient().get(vKey);
      const namespace = key.split(':')[0];
      this.cacheOps.labels({ result: raw ? 'hit' : 'miss', namespace }).inc();
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    } finally {
      this.redisDuration.labels({ redis_command: 'get' }).observe((Date.now() - start) / 1000);
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    const vKey = await this.buildKey(key);
    const start = Date.now();
    try {
      await this.redis.getClient().set(vKey, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed key=${key}: ${(err as Error).message}`);
    } finally {
      this.redisDuration.labels({ redis_command: 'set' }).observe((Date.now() - start) / 1000);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        const vKeys = await Promise.all(keys.map((k) => this.buildKey(k)));
        await this.redis.getClient().del(...vKeys);
      }
    } catch {
      /* no-op */
    }
  }

  /*
   - SCAN cursor instead of KEYS * to avoid blocking the Redis event loop on large keyspaces.
   - Pattern is prefixed with the current version so only live-era keys are targeted.
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const v = await this.getVersion();
      let cursor = '0';
      do {
        const [next, keys] = await this.redis
          .getClient()
          .scan(cursor, 'MATCH', `v${v}:${pattern}`, 'COUNT', '100');
        cursor = next;
        if (keys.length > 0) await this.redis.getClient().del(...keys);
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`Cache invalidation failed pattern=${pattern}: ${(err as Error).message}`);
    }
  }

  /*
   - Cache-aside with stampede prevention, negative caching, and in-process request coalescing.
   - On miss the first caller acquires a Redis lock, fetches, and populates the cache.
   - If fetchFn throws NotFoundException, a sentinel is cached so subsequent requests skip the DB.
   - Concurrent misses on the same replica share one in-flight promise (singleflight).
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (this.isSentinel(cached)) throw new NotFoundException();
    if (cached !== null) return cached;

    /*
     - S17: lock acquisition skipped — all concurrent cache-miss requests call fetchFn at once.
     - Signal: on burst after cache flush, Jaeger shows many parallel prisma spans for the same key.
    */
    if (!isBugScenario(17)) return this.coalescedFetch(key, ttlSeconds, fetchFn);

    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /*
   - Singleflight: if a fetch is already in-flight for this key on this replica, join it.
   - Otherwise acquire the Redis lock (cross-replica guard) and start a new fetch.
   - Falls back to polling if this replica loses the lock race.
   */
  private async coalescedFetch<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    const inflight = this.inflight.get(key);
    if (inflight) return inflight as Promise<T>;

    const token = await this.acquireLock(key);
    if (token) {
      const promise = this.fetchAndCache(key, ttlSeconds, fetchFn, token).finally(() => {
        this.inflight.delete(key);
      });
      this.inflight.set(key, promise);
      return promise;
    }

    const polled = await this.pollUntilCached<T>(key);
    if (this.isSentinel(polled)) throw new NotFoundException();
    return polled ?? fetchFn();
  }

  private isSentinel(value: unknown): boolean {
    return value === NEGATIVE_SENTINEL;
  }

  /*
   - Called when this replica wins the lock. Double-checks the cache, fetches if still a miss,
   - and stores a negative sentinel when fetchFn throws NotFoundException.
   */
  private async fetchAndCache<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
    token: string,
  ): Promise<T> {
    let fromFetch = false;
    try {
      const doubleCheck = await this.get<T>(key);
      if (this.isSentinel(doubleCheck)) throw new NotFoundException();
      if (doubleCheck !== null) return doubleCheck;
      fromFetch = true;
      const value = await fetchFn();
      await this.set(key, value, ttlSeconds);
      return value;
    } catch (err) {
      if (fromFetch && err instanceof NotFoundException) {
        await this.set(key, NEGATIVE_SENTINEL, NEGATIVE_TTL_S);
      }
      throw err;
    } finally {
      await this.releaseLock(key, token);
    }
  }

  /*
   - Refresh-ahead variant for designated hot keys (product listings, category tree).
   - Stores { value, refreshAt } so a cache hit past the refresh threshold triggers a
   - non-blocking background re-fetch, preventing callers from ever seeing an expired entry.
   */
  async getOrSetRefreshAhead<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
    refreshThreshold = 0.8,
  ): Promise<T> {
    const wrapped = await this.get<{ value: T; refreshAt: number }>(key);
    if (wrapped !== null) {
      if (Date.now() > wrapped.refreshAt) {
        setImmediate(
          () => void this.doBackgroundRefresh(key, ttlSeconds, fetchFn, refreshThreshold),
        );
      }
      return wrapped.value;
    }
    return this.fetchAndStoreRefreshAhead(key, ttlSeconds, fetchFn, refreshThreshold);
  }

  private async fetchAndStoreRefreshAhead<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
    refreshThreshold: number,
  ): Promise<T> {
    const value = await fetchFn();
    const refreshAt = Date.now() + ttlSeconds * refreshThreshold * 1000;
    await this.set(key, { value, refreshAt }, ttlSeconds);
    return value;
  }

  private async doBackgroundRefresh<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
    refreshThreshold: number,
  ): Promise<void> {
    try {
      await this.fetchAndStoreRefreshAhead(key, ttlSeconds, fetchFn, refreshThreshold);
    } catch {
      /* stale value remains valid until TTL expires; next explicit request will re-fetch */
    }
  }

  /*
   - Stale-while-revalidate: two Redis keys — a short-lived fresh key and a 10× TTL stale copy.
   - On fresh-key miss but stale-key hit, return the stale value immediately and trigger a
   - background re-fetch. Use for listing pages where slight staleness is acceptable.
   */
  async getOrSetSWR<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    const fresh = await this.get<T>(key);
    if (fresh !== null) return fresh;

    const stale = await this.get<T>(`stale:${key}`);
    if (stale !== null) {
      setImmediate(() => void this.swrRefresh(key, ttlSeconds, fetchFn));
      return stale;
    }

    return this.swrFetchAndStore(key, ttlSeconds, fetchFn);
  }

  private async swrFetchAndStore<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    await this.set(`stale:${key}`, value, ttlSeconds * 10);
    return value;
  }

  private async swrRefresh<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
  ): Promise<void> {
    try {
      await this.swrFetchAndStore(key, ttlSeconds, fetchFn);
    } catch {
      /* stale value remains valid until its TTL expires; next request will retry */
    }
  }

  private async acquireLock(key: string): Promise<string | null> {
    const token = `${Date.now()}-${Math.random()}`;
    const result = await this.redis.getClient().set(`lock:${key}`, token, 'PX', LOCK_TTL_MS, 'NX');
    return result === 'OK' ? token : null;
  }

  private async releaseLock(key: string, token: string): Promise<void> {
    await this.redis.getClient().eval(RELEASE_LOCK_LUA, 1, `lock:${key}`, token);
  }

  private async pollUntilCached<T>(key: string): Promise<T | null> {
    for (let i = 0; i < LOCK_MAX_RETRIES; i++) {
      await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
      const cached = await this.get<T>(key);
      if (cached !== null) return cached;
    }
    return null;
  }

  async bloomAdd(key: string, value: string): Promise<void> {
    try {
      await this.redis.getClient().call('BF.ADD', key, value);
    } catch {
      /* RedisBloom not loaded — no-op */
    }
  }

  async bloomExists(key: string, value: string): Promise<boolean> {
    try {
      const result = (await this.redis.getClient().call('BF.EXISTS', key, value)) as number;
      return result === 1;
    } catch {
      return true; /* filter unavailable → allow through to DB */
    }
  }

  async bloomAddMany(key: string, values: string[]): Promise<void> {
    if (values.length === 0) return;
    try {
      const pipeline = this.redis.getClient().pipeline();
      for (const value of values) pipeline.call('BF.ADD', key, value);
      await pipeline.exec();
    } catch {
      /* no-op */
    }
  }

  subscribe(channel: string, handler: () => void): void {
    const sub = this.redis.getSubscriber();
    sub.subscribe(channel).catch((err: Error) => {
      this.logger.warn(`Subscribe failed channel=${channel}: ${err.message}`);
    });
    sub.on('message', (ch: string) => {
      if (ch === channel) handler();
    });
  }

  async publish(channel: string): Promise<void> {
    try {
      await this.redis.getClient().publish(channel, '');
    } catch (err) {
      this.logger.warn(`Cache publish failed channel=${channel}: ${(err as Error).message}`);
    }
  }
}
