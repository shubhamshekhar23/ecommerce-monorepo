import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';

// Fan-out pattern: one "back in stock" event → N notification jobs (one per subscriber).
// This keeps the stock-update path fast — it just enqueues jobs, doesn't send emails.
// The queue workers send the actual emails, in parallel, at their own pace.
//
// Why fan-out via a queue (not direct email)?
//   If 10,000 users subscribed to a Nike shoe restock, sending 10,000 emails inline
//   during the stock update request would time out and block the request.
//   With fan-out: stock update takes ~5ms, email queue drains in the background.
export const PRODUCT_RESTOCKED_EVENT = 'product.restocked';

@Injectable()
export class StockAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.STOCK_ALERTS) private readonly alertsQueue: Queue,
  ) {}

  async subscribe(userId: string, productId: string, email: string): Promise<void> {
    await this.prisma.stockAlert.upsert({
      where: { productId_userId: { productId, userId } },
      create: { id: crypto.randomUUID(), productId, userId, email },
      update: { notified: false, email }, // re-subscribe if already notified
    });
  }

  async unsubscribe(userId: string, productId: string): Promise<void> {
    await this.prisma.stockAlert.deleteMany({ where: { productId, userId } });
  }

  // Called when an admin restocks a product. Fans out to all subscribers.
  @OnEvent(PRODUCT_RESTOCKED_EVENT)
  async handleRestock(payload: { productId: string; productName: string }): Promise<void> {
    const alerts = await this.prisma.stockAlert.findMany({
      where: { productId: payload.productId, notified: false },
    });

    // Enqueue one job per subscriber — each job sends one email
    for (const alert of alerts) {
      await this.alertsQueue.add('send-stock-alert', {
        alertId: alert.id,
        email: alert.email,
        productName: payload.productName,
      });
    }

    // Mark all as notified atomically
    await this.prisma.stockAlert.updateMany({
      where: { productId: payload.productId, notified: false },
      data: { notified: true },
    });
  }
}
