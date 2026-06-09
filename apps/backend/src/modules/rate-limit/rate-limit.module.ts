import { Module } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimiterService } from './rate-limiter.service';

/*
 - CacheModule is @Global() — RedisService is available here without an explicit import.
 */
@Module({
  providers: [RateLimitGuard, RateLimiterService],
  exports: [RateLimitGuard, RateLimiterService],
})
export class RateLimitModule {}
