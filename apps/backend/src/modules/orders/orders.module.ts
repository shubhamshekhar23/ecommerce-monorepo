import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { ShippingModule } from '@/modules/shipping/shipping.module';
import { TaxModule } from '@/modules/tax/tax.module';
import { KafkaProducerModule } from '@/modules/kafka/kafka-producer.module';
import { OrderSagaService } from './saga/order-saga.service';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderQueryService } from './queries/order-query.service';
import { OrderStatusRegistry } from './order-status.registry';
import { OrdersGateway } from './orders.gateway';
import { OrderReadModelHandler } from './handlers/order-read-model.handler';
import { PaymentConfirmedHandler } from './handlers/payment-confirmed.handler';
import { OrderNotificationHandler } from './handlers/order-notification.handler';
import { OrderAnalyticsHandler } from './handlers/order-analytics.handler';
import { OrdersResolver } from './orders.resolver';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { OrderEventStore } from './order-event-store.service';
import { OrderProjectionService } from './order-projection.service';
import { PromotionsModule } from '@/modules/promotions/promotions.module';
import { OrderProcessingPipeline } from './pipeline/order-processing.pipeline';
import { AcquireLocksFilter } from './pipeline/filters/acquire-locks.filter';
import { ValidateStockFilter } from './pipeline/filters/validate-stock.filter';
import { ApplyPromotionsFilter } from './pipeline/filters/apply-promotions.filter';
import { CalculateTotalsFilter } from './pipeline/filters/calculate-totals.filter';
import { CreateOrderFilter } from './pipeline/filters/create-order.filter';
import { DecrementStockFilter } from './pipeline/filters/decrement-stock.filter';
import { ClearCartFilter } from './pipeline/filters/clear-cart.filter';
import { PublishEventsFilter } from './pipeline/filters/publish-events.filter';

@Module({
  imports: [
    PrismaModule,
    OutboxModule,
    MetricsModule,
    ShippingModule,
    TaxModule,
    KafkaProducerModule,
    PaymentsModule,
    PromotionsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        publicKey: config.get<string>('JWT_PUBLIC_KEY')?.replace(/\\n/g, '\n'),
        signOptions: { algorithm: 'RS256' },
      }),
    }),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderSagaService,
    OrderQueryService,
    OrderStatusRegistry,
    OrdersGateway,
    OrderReadModelHandler,
    PaymentConfirmedHandler,
    OrderNotificationHandler,
    OrderAnalyticsHandler,
    OrdersResolver,
    OrderEventStore,
    OrderProjectionService,
    OrderProcessingPipeline,
    AcquireLocksFilter,
    ValidateStockFilter,
    ApplyPromotionsFilter,
    CalculateTotalsFilter,
    CreateOrderFilter,
    DecrementStockFilter,
    ClearCartFilter,
    PublishEventsFilter,
  ],
  exports: [OrdersService, OrderQueryService, OrderProjectionService],
})
export class OrdersModule {}
