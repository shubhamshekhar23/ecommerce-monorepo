import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { OrderStatusChangedEvent } from '@/modules/events/order.events';
import { getInvoicePath } from './invoice.utils';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.INVOICES) private readonly invoiceQueue: Queue,
  ) {}

  @OnEvent(OrderStatusChangedEvent.EVENT_NAME)
  async handleOrderConfirmed(event: OrderStatusChangedEvent): Promise<void> {
    if (event.newStatus === OrderStatus.CONFIRMED) {
      await this.enqueueGeneration(event.orderId);
    }
  }

  // Idempotent: calling this twice for the same order is safe.
  // If the PDF is already on disk the job is not re-enqueued.
  // jobId deduplicates within BullMQ in case of rapid double-POSTs.
  async enqueueGeneration(orderId: string): Promise<void> {
    const filePath = getInvoicePath(orderId);
    const already = await access(filePath).then(() => true).catch(() => false);
    if (already) return;

    await this.invoiceQueue.add(
      'generate-invoice',
      { orderId },
      { jobId: `invoice-${orderId}`, removeOnComplete: 50 },
    );
  }

  // Returns 202 if the PDF is not ready yet so the client knows to retry.
  // Streams directly from the filesystem once the processor has written it —
  // no buffering in memory, safe for large files.
  async streamInvoice(orderId: string, userId: string, res: Response): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, orderNumber: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new NotFoundException('Order not found');

    const filePath = getInvoicePath(orderId);
    const ready = await access(filePath).then(() => true).catch(() => false);

    if (!ready) {
      res.status(202).json({ message: 'Invoice is being generated, try again in a few seconds' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);
    createReadStream(filePath).pipe(res);
  }
}
