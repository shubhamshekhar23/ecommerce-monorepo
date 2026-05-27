import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import Redis from 'ioredis';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator, RedisHealthIndicator } from './indicators';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    {
      provide: 'REDIS_CLIENT',
      // A dedicated ioredis connection just for health checks.
      // Phase 3 (caching) will introduce a shared RedisModule — at that point
      // this provider can be replaced with an injection from that module.
      useFactory: (): Redis => new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
  ],
})
export class HealthModule {}
