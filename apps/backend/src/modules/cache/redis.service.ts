import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  /*
   - Subscriber connection must be separate: once a client enters SUBSCRIBE mode
   - it cannot issue regular commands (GET, SET, SCAN, etc.).
   */
  private subscriber!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1 });
    this.subscriber = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    this.client.on('error', (err: Error) => this.logger.error('Redis error', err.message));
    this.subscriber.on('error', (err: Error) => this.logger.error('Redis sub error', err.message));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }
}
