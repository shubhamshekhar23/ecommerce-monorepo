import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Worker, Job } from 'bullmq';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';

// PDF generation pattern: NEVER generate in the HTTP request handler.
// A 1000-order invoice could take 30 seconds. The HTTP client would time out.
// Pattern: POST /orders/:id/invoice → 202 Accepted (job enqueued)
//          GET  /orders/:id/invoice → stream PDF if ready, or 202 if still generating
//
// For simplicity here, we stream synchronously on GET (acceptable for small invoices).
// In production: enqueue on POST, store in S3, redirect to signed URL on GET.
@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.INVOICES) private readonly invoiceQueue: Queue,
  ) {}

  async enqueueGeneration(orderId: string): Promise<void> {
    await this.invoiceQueue.add('generate-invoice', { orderId }, {
      jobId: `invoice:${orderId}`,
      removeOnComplete: 100,
    });
  }

  // Stream the PDF directly to the HTTP response.
  // Uses Node.js streams — the PDF is piped to res as it's generated,
  // not buffered in memory. Critical for large invoices.
  async streamInvoice(orderId: string, userId: string, res: Response): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, user: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new NotFoundException('Order not found');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    this.renderInvoice(doc, order);
    doc.end();
  }

  private renderInvoice(doc: PDFKit.PDFDocument, order: { orderNumber: string; createdAt: Date; totalPrice: unknown; items: Array<{ product: { name: string } | null; quantity: number; price: unknown }> }): void {
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
