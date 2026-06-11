import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { RedisService } from './redis.service';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';

const LOCK_TTL_MS = 5000;
const LOCK_RETRY_MS = 50;
const LOCK_MAX_RETRIES = 10;

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

  constructor(
    private readonly redis: RedisService,
    @InjectMetric('cache_operations_total') private readonly cacheOps: Counter<string>,
    @InjectMetric('redis_client_duration') private readonly redisDuration: Histogram<string>,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    /*
     - S4: always returns null — 100% cache miss rate, every request hits PostgreSQL.
     - Signal: cache_misses_total equals http request rate; Jaeger every span has a DB child.
    */
    if (isBugScenario(4)) return null;

    const start = Date.now();
    try {
      const raw = await this.redis.getClient().get(key);
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
    const start = Date.now();
    try {
      await this.redis.getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed key=${key}: ${(err as Error).message}`);
    } finally {
      this.redisDuration.labels({ redis_command: 'set' }).observe((Date.now() - start) / 1000);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) await this.redis.getClient().del(...keys);
    } catch {
      /* no-op */
    }
  }

  /*
   - SCAN cursor instead of KEYS * to avoid blocking the Redis event loop on large keyspaces.
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.redis
          .getClient()
          .scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = next;
        if (keys.length > 0) await this.redis.getClient().del(...keys);
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`Cache invalidation failed pattern=${pattern}: ${(err as Error).message}`);
    }
  }

  /*
   - Cache-aside with stampede prevention: the first caller on a miss acquires a Redis lock
   - (SET NX PX), fetches from the source, and populates the cache. Concurrent misses poll
   - until the winner populates the key. We re-check after acquiring the lock in case the
   - previous winner already finished. Falls back to a direct fetch if the lock expires.
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    /*
     - S17: lock acquisition skipped — all concurrent cache-miss requests call fetchFn at once.
     - Signal: on burst after cache flush, Jaeger shows many parallel prisma spans for the same key.
    */
    if (!isBugScenario(17)) {
      const token = await this.acquireLock(key);
      if (token) {
        try {
          const doubleCheck = await this.get<T>(key);
          if (doubleCheck !== null) return doubleCheck;
          const value = await fetchFn();
          await this.set(key, value, ttlSeconds);
          return value;
        } finally {
          await this.releaseLock(key, token);
        }
      }
      return (await this.pollUntilCached<T>(key)) ?? fetchFn();
    }

    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
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
}
