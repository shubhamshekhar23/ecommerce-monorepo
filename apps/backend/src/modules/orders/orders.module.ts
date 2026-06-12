import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { CircuitBreakerModule } from '@/modules/circuit-breaker/circuit-breaker.module';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { ShippingModule } from '@/modules/shipping/shipping.module';
import { OrderSagaService } from './saga/order-saga.service';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderQueryService } from './queries/order-query.service';
import { OrderReadModelHandler } from './handlers/order-read-model.handler';
import { PaymentConfirmedHandler } from './handlers/payment-confirmed.handler';
import { OrderNotificationHandler } from './handlers/order-notification.handler';

@Module({
  imports: [PrismaModule, OutboxModule, CircuitBreakerModule, MetricsModule, ShippingModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderSagaService,
    OrderQueryService,
    OrderReadModelHandler,
    PaymentConfirmedHandler,
    OrderNotificationHandler,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
