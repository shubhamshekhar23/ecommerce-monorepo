import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { MailService } from '@/modules/mail/mail.service';
import { OrderStatusChangedEvent } from '@/modules/events/order.events';

type OrderForShipping = Prisma.OrderGetPayload<{ include: { user: true } }>;

// Sends shipping notification email when an order transitions to SHIPPED.
// Order confirmation on creation is handled by the outbox → BullMQ pipeline (Phase 2).
@Injectable()
export class OrderNotificationHandler {
  private readonly logger = new Logger(OrderNotificationHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @OnEvent(OrderStatusChangedEvent.EVENT_NAME)
  async handle(event: OrderStatusChangedEvent): Promise<void> {
    if (event.newStatus !== OrderStatus.SHIPPED) return;
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { user: true },
    });
    if (!order) return;
    await this.sendShippingEmail(order);
  }

  private async sendShippingEmail(order: OrderForShipping): Promise<void> {
    await this.mailService.sendOrderShipped(
      order, order.user,
      'TRK-PLACEHOLDER', 'Standard Shipping',
      { firstName: order.user.firstName ?? '', lastName: '', addressLine1: 'On file', city: '', state: '', postalCode: '', country: '' },
    );
    this.logger.log(`Shipping email sent for order ${order.id}`);
  }
}
