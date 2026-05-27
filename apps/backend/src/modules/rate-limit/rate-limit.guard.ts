import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CacheService } from '@/modules/cache/cache.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

// Sliding window counter algorithm:
//   1. Redis sorted set per bucket key — members are timestamps of past requests
//   2. On each request: prune entries older than windowMs, add current timestamp, count remaining
//   3. If count > limit → 429; else allow
//
// Why sliding window over fixed window?
//   Fixed window resets at wall-clock boundaries (e.g. every minute at :00).
//   A burst of 10 requests at :59 + 10 more at :01 = 20 in 2 seconds but both pass a
//   limit-10 fixed window. Sliding window counts only the rolling last `windowMs` — no boundary attack.
//
// Why not token bucket?
//   Token bucket allows short bursts (up to the bucket capacity) then smooths to a steady rate.
//   Good for API throughput shaping; overkill for brute-force protection where we want hard limits.
//   Sliding window is simpler and sufficient for auth endpoints.

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cache: CacheService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!options) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const bucketKey = this.buildKey(req, ctx, options);
    const count = await this.cache.slidingWindowIncrement(bucketKey, options.windowMs);

    if (count > options.limit) {
      this.logger.warn(`Rate limit exceeded: key=${bucketKey} count=${count} limit=${options.limit}`);
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private buildKey(req: AuthenticatedRequest, ctx: ExecutionContext, opts: RateLimitOptions): string {
    const route = `${ctx.getClass().name}:${ctx.getHandler().name}`;
    const strategy = opts.keyStrategy ?? 'ip';

    if (strategy === 'user' || strategy === 'user-per-route') {
      const userId = req.user?.id ?? 'anon';
      return strategy === 'user' ? `rl:u:${userId}` : `rl:upr:${userId}:${route}`;
    }

    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    return `rl:ip:${ip}:${route}`;
  }
}
