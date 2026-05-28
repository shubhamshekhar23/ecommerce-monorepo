import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';

// NotificationWorker removed — notifications are now handled by the standalone
// notification-service which consumes from RabbitMQ. BullMQ is kept here for
// other background jobs (stock alerts, abandoned cart, invoice generation).
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
    BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
