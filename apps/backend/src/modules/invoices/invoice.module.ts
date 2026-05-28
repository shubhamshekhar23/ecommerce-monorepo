import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.INVOICES }),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
