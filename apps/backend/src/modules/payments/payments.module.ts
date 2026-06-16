import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { CircuitBreakerModule } from '@/modules/circuit-breaker/circuit-breaker.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { PaymentRetryProcessor } from './payment-retry.processor';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({ name: 'payment-retry' }),
    PrismaModule,
    OutboxModule,
    CircuitBreakerModule,
  ],
  providers: [PaymentRetryProcessor],
  exports: [BullModule],
})
export class PaymentsModule {}
