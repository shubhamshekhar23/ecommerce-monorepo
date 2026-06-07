import { Global, Module } from '@nestjs/common';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { RedisService } from './redis.service';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [
    RedisService,
    CacheService,
    makeCounterProvider({
      name: 'cache_operations_total',
      help: 'Cache hit and miss counts by namespace',
      labelNames: ['result', 'namespace'],
    }),
  ],
  exports: [RedisService, CacheService],
})
export class CacheModule {}
