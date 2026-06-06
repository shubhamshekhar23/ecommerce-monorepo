import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import PDFDocument from 'pdfkit';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';
import { getInvoicePath } from './invoice.utils';

type OrderForInvoice = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;

interface InvoiceJobData {
  orderId: string;
}

@Processor(QUEUE_NAMES.INVOICES, { concurrency: 2 })
export class InvoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<InvoiceJobData>): Promise<void> {
    const { orderId } = job.data;
    this.logger.log(`Generating invoice job=${job.id} orderId=${orderId}`);

    const order = await this.loadOrder(orderId);
    const filePath = getInvoicePath(orderId);
    await mkdir(dirname(filePath), { recursive: true });
    await this.writePdf(order, filePath);

    this.logger.log(`Invoice ready job=${job.id} path=${filePath}`);
  }

  private async loadOrder(orderId: string): Promise<OrderForInvoice> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new Error(`Order ${orderId} not found`);
    return order;
  }

  private writePdf(order: OrderForInvoice, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filePath);
      doc.pipe(stream);
      this.renderContent(doc, order);
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  private renderContent(doc: PDFKit.PDFDocument, order: OrderForInvoice): void {
    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order: ${order.orderNumber}`);
    doc.text(`Date: ${order.createdAt.toLocaleDateString()}`);
    doc.moveDown();
    doc.text('Items:', { underline: true });
    for (const item of order.items) {
      doc.text(`  ${item.product?.name ?? 'Unknown'} × ${item.quantity}  $${item.price}`);
    }
    doc.moveDown();
    doc.fontSize(14).text(`Total: $${order.totalPrice}`, { align: 'right' });
  }
}
