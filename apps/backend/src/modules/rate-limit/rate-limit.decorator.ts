import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /** Max requests allowed within windowMs */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /**
   * How to derive the rate-limit bucket key:
   *   'ip'            — one bucket per client IP (good for public/unauthenticated routes)
   *   'user'          — one bucket per authenticated user across all routes
   *   'user-per-route'— one bucket per user per endpoint (more granular)
   */
  keyStrategy?: 'ip' | 'user' | 'user-per-route';
}

export const RATE_LIMIT_KEY = 'rate_limit';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
