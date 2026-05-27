import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      // PING → PONG: round-trips through the TCP connection to Redis.
      // If Redis is down, ioredis throws and we catch it below.
      const result = await this.redis.ping();
      return this.getStatus('redis', result === 'PONG');
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus('redis', false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  // Close the dedicated health-check Redis connection on module teardown.
  // This fires when NestJS receives SIGTERM (because enableShutdownHooks is on).
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
