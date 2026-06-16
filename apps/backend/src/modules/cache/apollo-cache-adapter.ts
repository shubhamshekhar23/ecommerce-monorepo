import type { KeyValueCache } from '@apollo/utils.keyvaluecache';
import type { RedisService } from './redis.service';

const APQ_TTL_SECONDS = 300;

/*
 - Bridges Apollo's KeyValueCache interface to the existing ioredis client.
 - Keys are namespaced under "apq:" to avoid collisions with application cache keys.
 - Used as the APQ (Automatic Persisted Queries) store in GraphQLModule.forRootAsync.
 */
export class ApolloCacheAdapter implements KeyValueCache<string> {
  constructor(private readonly redis: RedisService) {}

  async get(key: string): Promise<string | undefined> {
    const value = await this.redis.getClient().get(key);
    return value ?? undefined;
  }

  async set(key: string, value: string, options?: { ttl?: number | null }): Promise<void> {
    const ttl = options?.ttl ?? APQ_TTL_SECONDS;
    if (ttl === null) {
      await this.redis.getClient().set(key, value);
    } else {
      await this.redis.getClient().set(key, value, 'EX', ttl);
    }
  }

  async delete(key: string): Promise<boolean | void> {
    await this.redis.getClient().del(key);
  }
}
