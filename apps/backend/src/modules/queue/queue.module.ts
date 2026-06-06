import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Configures the shared Redis connection for all BullMQ queues in the app.
// Individual queue registrations live in their own feature modules.
// Notifications moved to RabbitMQ + notification-service in Phase 9.
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const raw = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        const url = new URL(raw);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
