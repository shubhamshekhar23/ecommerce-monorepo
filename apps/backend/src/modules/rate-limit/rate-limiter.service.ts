import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/modules/cache/redis.service';

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

/*
 - Token bucket: refills tokens at a steady rate; bursts are allowed up to capacity.
 - Returns 1 (allowed) or 0 (denied). Atomic read-modify-write via Lua.
 - Trade-off vs sliding window: allows short legitimate bursts (e.g. 5 quick cart ops)
 - while still enforcing long-term throughput. Sliding window penalises all bursts equally.
 */
const TOKEN_BUCKET_LUA = `
  local key        = KEYS[1]
  local capacity   = tonumber(ARGV[1])
  local refillRate = tonumber(ARGV[2])
  local now        = tonumber(ARGV[3])
  local cost       = tonumber(ARGV[4])

  local data       = redis.call('HMGET', key, 'tokens', 'lastRefill')
  local tokens     = tonumber(data[1]) or capacity
  local lastRefill = tonumber(data[2]) or now

  local elapsed = math.max(0, (now - lastRefill) / 1000)
  tokens = math.min(capacity, tokens + elapsed * refillRate)

  if tokens < cost then
    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
    redis.call('EXPIRE', key, 3600)
    return 0
  end

  tokens = tokens - cost
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
  redis.call('EXPIRE', key, 3600)
  return 1
`;

export type RateLimitAlgorithm = 'sliding_window' | 'token_bucket';

@Injectable()
export class RateLimiterService {
  readonly algorithm: RateLimitAlgorithm;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const algo = this.config.get<string>('RATE_LIMIT_ALGORITHM') ?? 'sliding_window';
    this.algorithm = algo === 'token_bucket' ? 'token_bucket' : 'sliding_window';
  }

  /*
   - Returns the number of requests in the current sliding window after recording this one.
   - Caller compares count against the configured limit.
   */
  async addAndCountInWindow(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const member = `${now}-${Math.random()}`;
    const count = await this.redis
      .getRateLimitClient()
      .eval(SLIDING_WINDOW_LUA, 1, key, String(now), String(windowMs), member);
    return Number(count);
  }

  /*
   - Returns true when the request is allowed, false when the bucket is empty.
   - capacity = max burst size; refillRate = tokens added per second.
   */
  async checkTokenBucket(key: string, capacity: number, refillRate: number): Promise<boolean> {
    const result = await this.redis
      .getRateLimitClient()
      .eval(
        TOKEN_BUCKET_LUA,
        1,
        key,
        String(capacity),
        String(refillRate),
        String(Date.now()),
        '1',
      );
    return result === 1;
  }
}
