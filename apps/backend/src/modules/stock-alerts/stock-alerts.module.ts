import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { MailModule } from '@/modules/mail/mail.module';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { StockAlertsService } from './stock-alerts.service';
import { StockAlertsController } from './stock-alerts.controller';
import { StockAlertProcessor } from './stock-alert.processor';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.STOCK_ALERTS,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'custom' },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [StockAlertsController],
  providers: [StockAlertsService, StockAlertProcessor],
  exports: [StockAlertsService],
})
export class StockAlertsModule {}
