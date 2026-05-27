import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from '@/modules/mail/mail.module';
import { NotificationWorker } from './workers/notification.worker';
import { QUEUE_NAMES } from './queue.constants';

// Why one shared BullModule.forRootAsync?
// BullMQ creates a single Redis connection per root config. All queues in the app
// reuse it. Defining it here (re-exported via BullModule) means every other module
// that imports QueueModule gets the connection for free.
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
    MailModule,
  ],
  providers: [NotificationWorker],
  // Export BullModule so other modules can inject queues with @InjectQueue()
  exports: [BullModule],
})
export class QueueModule {}
