import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { CircuitBreakerModule } from '@/modules/circuit-breaker/circuit-breaker.module';
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

@Module({
  imports: [
    PrismaModule,
    OutboxModule,
    CircuitBreakerModule,
    MetricsModule,
    ShippingModule,
    TaxModule,
    KafkaProducerModule,
    PaymentsModule,
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
  ],
  exports: [OrdersService, OrderQueryService],
})
export class OrdersModule {}
