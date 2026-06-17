import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { CircuitBreakerModule } from '@/modules/circuit-breaker/circuit-breaker.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { StripeModule } from '@/modules/stripe/stripe.module';
import { PaymentRetryProcessor } from './payment-retry.processor';
import { PaymentPluginRegistry } from './registry/payment-plugin.registry';
import { StripeProvider } from './providers/stripe.provider';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({ name: 'payment-retry' }),
    PrismaModule,
    OutboxModule,
    CircuitBreakerModule,
    StripeModule,
  ],
  providers: [PaymentRetryProcessor, PaymentPluginRegistry, StripeProvider, PaymentService],
  exports: [BullModule, PaymentPluginRegistry, PaymentService],
})
export class PaymentsModule {}
