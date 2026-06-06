import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.STOCK_ALERTS },
      { name: QUEUE_NAMES.CART_RECOVERY },
    ),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
