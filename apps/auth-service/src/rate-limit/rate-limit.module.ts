import { Module } from '@nestjs/common';
import { RedisService } from '../cache/redis.service';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  providers: [RedisService, RateLimiterService, RateLimitGuard],
  exports: [RateLimiterService, RateLimitGuard],
})
export class RateLimitModule {}
