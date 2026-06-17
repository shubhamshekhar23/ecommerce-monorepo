import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OutboxService } from '@/modules/outbox/outbox.service';
import { CorrelationIdService } from '@/common/services/correlation-id.service';
import { OrderEventStore } from '../../order-event-store.service';
import type { NotificationJobPayload } from '@/modules/queue/dto/notification-job.dto';
import type { IOrderFilter } from '../order-filter.interface';
import type { OrderContext } from '../order-context';

@Injectable()
export class PublishEventsFilter implements IOrderFilter {
  constructor(
    private readonly outbox: OutboxService,
    private readonly orderEventStore: OrderEventStore,
    private readonly correlationId: CorrelationIdService,
  ) {}

  async execute(ctx: OrderContext): Promise<void> {
    const order = ctx.order!;
    await this.outbox.publish(ctx.tx, {
      aggregateId: order.id,
      aggregateType: 'Order',
      eventType: 'ORDER_CREATED',
      payload: this.buildPayload(ctx) as unknown as Prisma.InputJsonValue,
    });
    await this.orderEventStore.append(
      order.id,
      'ORDER_CREATED',
      { userId: ctx.userId, orderNumber: order.orderNumber, status: 'PENDING' },
      ctx.tx,
    );
  }

  private buildPayload(ctx: OrderContext): NotificationJobPayload {
    const order = ctx.order!;
    return {
      type: 'order-confirmation',
      orderId: order.id,
      userId: order.userId,
      userEmail: ctx.user.email,
      firstName: ctx.user.firstName ?? '',
      orderNumber: order.orderNumber,
      totalPrice: parseFloat(String(order.totalPrice)),
      items: ctx.cart.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        price: parseFloat(String(i.variant!.price)),
      })),
      createdAt: order.createdAt.toISOString(),
      correlationId: this.correlationId.get(),
    };
  }
}
