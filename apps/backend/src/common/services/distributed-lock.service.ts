import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '@/modules/cache/redis.service';

/*
 - Why a Lua script for release?
 - Two separate commands (GET then DEL) have a race window: another process could
 - acquire the lock between our GET and DEL, and we'd delete their lock.
 - A Lua script is atomic from Redis's perspective — it runs without interruption.
 */
const RELEASE_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly redis: RedisService) {}

  /*
   - Acquires the lock and runs fn. If the lock is already held, returns
   - immediately without running fn — callers should treat this as "another
   - replica is handling this tick, skip." not as an error.
   - Returns true if fn ran, false if the lock was not acquired.
   */
  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<{ ran: boolean; result?: T }> {
    const token = randomUUID();
    const client = this.redis.getClient();

    const acquired = await client.set(`lock:${key}`, token, 'PX', ttlMs, 'NX');
    if (!acquired) {
      return { ran: false };
    }

    try {
      const result = await fn();
      return { ran: true, result };
    } finally {
      await client
        .eval(RELEASE_SCRIPT, 1, `lock:${key}`, token)
        .catch((err: unknown) =>
          this.logger.warn(`Lock release failed for key=${key}: ${String(err)}`),
        );
    }
  }
}
