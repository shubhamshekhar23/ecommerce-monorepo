import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceProcessor } from './invoice.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.INVOICES,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceProcessor],
})
export class InvoiceModule {}
