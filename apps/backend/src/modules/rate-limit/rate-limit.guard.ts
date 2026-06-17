import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RateLimiterService } from './rate-limiter.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

/*
 - Supports two algorithms, selected at startup via RATE_LIMIT_ALGORITHM env var:
 -
 - sliding_window (default): counts requests in a rolling time window. Hard limit —
 -   every request in the window is counted equally. Good for auth brute-force protection.
 -
 - token_bucket: tokens refill at a steady rate; short bursts are allowed up to capacity.
 -   Good for human-facing API paths where adding 5 cart items quickly is legitimate.
 -   Refill rate derived from options: capacity = limit, rate = limit / (windowMs / 1000) t/s.
 */

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!options) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const bucketKey = this.buildKey(req, ctx, options);
    const denied = await this.isDenied(bucketKey, options);

    if (denied) {
      this.logger.warn(`Rate limit exceeded: key=${bucketKey} algo=${this.rateLimiter.algorithm}`);
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async isDenied(key: string, opts: RateLimitOptions): Promise<boolean> {
    if (this.rateLimiter.algorithm === 'token_bucket') {
      const refillRate = opts.limit / (opts.windowMs / 1000);
      const allowed = await this.rateLimiter.checkTokenBucket(key, opts.limit, refillRate);
      return !allowed;
    }
    const count = await this.rateLimiter.addAndCountInWindow(key, opts.windowMs);
    return count > opts.limit;
  }

  private buildKey(
    req: AuthenticatedRequest,
    ctx: ExecutionContext,
    opts: RateLimitOptions,
  ): string {
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
