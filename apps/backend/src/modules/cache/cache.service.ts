import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Sliding window counter: atomically remove expired entries, add current, return count.
// Using a Lua script ensures the three Redis commands are executed as one atomic unit —
// without this, a concurrent request could read a stale ZCARD between ZREMRANGEBYSCORE
// and ZADD.
const SLIDING_WINDOW_LUA = `
  local key    = KEYS[1]
  local now    = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local member = ARGV[3]
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window)
  return redis.call('ZCARD', key)
`;

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1 });
    this.redis.on('error', (err: Error) => this.logger.error('Redis cache error', err.message));
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed key=${key}: ${(err as Error).message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) await this.redis.del(...keys);
    } catch { /* no-op */ }
  }

  // SCAN cursor instead of KEYS * to avoid blocking the Redis event loop on large keyspaces.
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = next;
        if (keys.length > 0) await this.redis.del(...keys);
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`Cache invalidation failed pattern=${pattern}: ${(err as Error).message}`);
    }
  }

  // Returns the number of requests in the current sliding window after recording this one.
  // Caller compares count against the configured limit.
  async slidingWindowIncrement(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const member = `${now}-${Math.random()}`;
    const count = await this.redis.eval(SLIDING_WINDOW_LUA, 1, key, String(now), String(windowMs), member);
    return Number(count);
  }
}
