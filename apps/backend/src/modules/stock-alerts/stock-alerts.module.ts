import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { StockAlertsService } from './stock-alerts.service';
import { StockAlertsController } from './stock-alerts.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.STOCK_ALERTS }),
  ],
  controllers: [StockAlertsController],
  providers: [StockAlertsService],
  exports: [StockAlertsService],
})
export class StockAlertsModule {}
