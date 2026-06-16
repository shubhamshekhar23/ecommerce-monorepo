import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { OutboxService } from './outbox.service';
import { OutboxProcessor } from './outbox.processor';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    RabbitMQModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
        exchanges: [
          { name: 'order.events', type: 'topic' },
          { name: 'user.events', type: 'topic' },
          { name: 'product.events', type: 'topic' },
          { name: 'review.events', type: 'topic' },
        ],
        // Don't fail app startup if RabbitMQ is unavailable in dev without broker running
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  providers: [OutboxService, OutboxProcessor],
  // Export RabbitMQModule so modules that import OutboxModule can also inject
  // AmqpConnection directly (e.g. OrderNotificationHandler for shipped events).
  exports: [OutboxService, RabbitMQModule],
})
export class OutboxModule {}
