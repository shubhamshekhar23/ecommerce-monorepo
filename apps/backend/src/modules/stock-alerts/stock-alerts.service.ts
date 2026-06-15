import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { QUEUE_NAMES } from '@/modules/queue/queue.constants';

/*
 - Fan-out pattern: one "back in stock" event → N notification jobs (one per subscriber).
 - This keeps the stock-update path fast — it just enqueues jobs, doesn't send emails.
 - The queue workers send the actual emails, in parallel, at their own pace.
 -
 - Why fan-out via a queue (not direct email)?
 -   If 10,000 users subscribed to a Nike shoe restock, sending 10,000 emails inline
 -   during the stock update request would time out and block the request.
 -   With fan-out: stock update takes ~5ms, email queue drains in the background.
 */
export const PRODUCT_RESTOCKED_EVENT = 'product.restocked';

@Injectable()
export class StockAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.STOCK_ALERTS) private readonly alertsQueue: Queue,
  ) {}

  /*
   - Prisma's compound unique where clause does not accept null for nullable fields,
   - so we use findFirst + create/update instead of upsert.
   */
  async subscribe(
    userId: string,
    productId: string,
    email: string,
    variantId?: string,
  ): Promise<void> {
    const resolvedVariantId = variantId ?? null;
    const existing = await this.prisma.stockAlert.findFirst({
      where: { productId, variantId: resolvedVariantId, userId },
    });
    if (existing) {
      await this.prisma.stockAlert.update({
        where: { id: existing.id },
        data: { notified: false, email },
      });
      return;
    }
    await this.prisma.stockAlert.create({
      data: { id: crypto.randomUUID(), productId, variantId: resolvedVariantId, userId, email },
    });
  }

  async unsubscribe(userId: string, productId: string, variantId?: string): Promise<void> {
    await this.prisma.stockAlert.deleteMany({
      where: { productId, userId, variantId: variantId ?? null },
    });
  }

  /*
   - Called when an admin restocks a variant. Fans out to:
   - 1. Variant-level subscribers (subscribed to the exact variantId)
   - 2. Product-level subscribers (subscribed with no variantId, notified on any restock)
   - notified is set to true by the processor AFTER successful email delivery —
   - BullMQ retries still reach undelivered subscribers if the SMTP send fails.
   */
  @OnEvent(PRODUCT_RESTOCKED_EVENT)
  async handleRestock(payload: {
    productId: string;
    variantId: string;
    productName: string;
  }): Promise<void> {
    const alerts = await this.prisma.stockAlert.findMany({
      where: {
        productId: payload.productId,
        notified: false,
        OR: [{ variantId: payload.variantId }, { variantId: null }],
      },
      include: { product: { select: { slug: true } } },
    });

    for (const alert of alerts) {
      await this.alertsQueue.add('send-stock-alert', {
        alertId: alert.id,
        email: alert.email,
        productName: payload.productName,
        productSlug: alert.product.slug,
      });
    }
  }
}
