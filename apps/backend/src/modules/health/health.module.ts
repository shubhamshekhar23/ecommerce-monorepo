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
      /*
       - Dedicated ioredis connection for health checks only.
       - Kept separate from RedisService so a hung app connection doesn't mask a healthy Redis.
       */
      useFactory: (): Redis => new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
  ],
})
export class HealthModule {}
