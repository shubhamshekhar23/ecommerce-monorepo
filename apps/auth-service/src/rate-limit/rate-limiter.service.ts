import { Injectable } from '@nestjs/common';
import { RedisService } from '../cache/redis.service';

/*
 - Sliding window counter: atomically remove expired entries, add current, return count.
 - Lua script ensures the three Redis commands execute as one atomic unit —
 - without this, a concurrent request could read a stale ZCARD between ZREMRANGEBYSCORE and ZADD.
 */
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
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  async addAndCountInWindow(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const member = `${now}-${Math.random()}`;
    const count = await this.redis
      .getClient()
      .eval(SLIDING_WINDOW_LUA, 1, key, String(now), String(windowMs), member);
    return Number(count);
  }
}
