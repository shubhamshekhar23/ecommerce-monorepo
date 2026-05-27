import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { OutboxModule } from '@/modules/outbox/outbox.module';
import { CircuitBreakerModule } from '@/modules/circuit-breaker/circuit-breaker.module';
import { OrderSagaService } from './saga/order-saga.service';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [PrismaModule, OutboxModule, CircuitBreakerModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderSagaService],
  exports: [OrdersService],
})
export class OrdersModule {}
