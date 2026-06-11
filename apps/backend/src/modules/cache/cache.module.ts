import { Global, Module } from '@nestjs/common';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
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
    makeHistogramProvider({
      name: 'redis_client_duration',
      help: 'Redis command duration in seconds',
      labelNames: ['redis_command'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    }),
  ],
  exports: [RedisService, CacheService],
})
export class CacheModule {}
