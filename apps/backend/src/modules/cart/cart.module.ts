import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { ProductsModule } from '@/modules/products/products.module';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartRecoveryService } from './cart-recovery.service';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.CART_RECOVERY }),
  ],
  controllers: [CartController],
  providers: [CartService, CartRecoveryService],
  exports: [CartService, CartRecoveryService],
})
export class CartModule {}
