import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RateLimiterService } from './rate-limiter.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

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
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!options) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const bucketKey = this.buildKey(req, ctx, options);
    const count = await this.rateLimiter.addAndCountInWindow(bucketKey, options.windowMs);

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
