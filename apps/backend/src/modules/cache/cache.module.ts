import { Global, Module } from '@nestjs/common';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [
    CacheService,
    makeCounterProvider({
      name: 'cache_operations_total',
      help: 'Cache hit and miss counts by namespace',
      labelNames: ['result', 'namespace'],
    }),
  ],
  exports: [CacheService],
})
export class CacheModule {}
