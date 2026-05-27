import { Module } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

// CacheModule is @Global() — CacheService is injected here without an explicit import.
@Module({
  providers: [RateLimitGuard],
  exports: [RateLimitGuard],
})
export class RateLimitModule {}
