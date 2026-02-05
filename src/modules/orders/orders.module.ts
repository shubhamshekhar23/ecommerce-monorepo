import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { StripeModule } from '@/modules/stripe/stripe.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [PrismaModule, StripeModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
