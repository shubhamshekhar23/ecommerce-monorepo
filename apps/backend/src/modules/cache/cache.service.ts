import { Injectable, Logger } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { RedisService } from './redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    private readonly redis: RedisService,
    @InjectMetric('cache_operations_total') private readonly cacheOps: Counter<string>,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.getClient().get(key);
      const namespace = key.split(':')[0];
      this.cacheOps.labels({ result: raw ? 'hit' : 'miss', namespace }).inc();
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    try {
      await this.redis.getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed key=${key}: ${(err as Error).message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) await this.redis.getClient().del(...keys);
    } catch { /* no-op */ }
  }

  /*
   - SCAN cursor instead of KEYS * to avoid blocking the Redis event loop on large keyspaces.
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.getClient().scan(cursor, 'MATCH', pattern, 'COUNT', '100');
        cursor = next;
        if (keys.length > 0) await this.redis.getClient().del(...keys);
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`Cache invalidation failed pattern=${pattern}: ${(err as Error).message}`);
    }
  }
}
