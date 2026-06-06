import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { ProductsModule } from '@/modules/products/products.module';
import { MailModule } from '@/modules/mail/mail.module';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartRecoveryService } from './cart-recovery.service';
import { CartRecoveryProcessor } from './cart-recovery.processor';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    MailModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.CART_RECOVERY,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'custom' },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [CartController],
  providers: [CartService, CartRecoveryService, CartRecoveryProcessor],
  exports: [CartService, CartRecoveryService],
})
export class CartModule {}
