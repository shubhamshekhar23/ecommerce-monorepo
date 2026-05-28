import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { EXCHANGES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { OrderShippedEvent } from '@ecommerce/shared-types';
import { OrderStatusChangedEvent } from '@/modules/events/order.events';

type OrderForShipping = Prisma.OrderGetPayload<{ include: { user: true } }>;

// Publishes order.shipped to RabbitMQ when an order transitions to SHIPPED.
// notification-service consumes this and sends the shipping email.
// Order confirmation (CREATED) is handled by the outbox → RabbitMQ pipeline.
@Injectable()
export class OrderNotificationHandler {
  private readonly logger = new Logger(OrderNotificationHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqp: AmqpConnection,
  ) {}

  @OnEvent(OrderStatusChangedEvent.EVENT_NAME)
  async handle(event: OrderStatusChangedEvent): Promise<void> {
    if (event.newStatus !== OrderStatus.SHIPPED) return;

    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { user: true },
    });
    if (!order) return;

    await this.publishShippedEvent(order);
  }

  private async publishShippedEvent(order: OrderForShipping): Promise<void> {
    const payload: OrderShippedEvent = {
      orderId: order.id,
      userId: order.userId,
      userEmail: order.user.email,
      firstName: order.user.firstName ?? '',
      orderNumber: order.orderNumber,
      trackingNumber: 'TRK-PLACEHOLDER',
      carrier: 'Standard Shipping',
      shippingAddress: {
        firstName: order.user.firstName ?? '',
        lastName: '',
        addressLine1: 'On file',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
    };

    await this.amqp.publish(EXCHANGES.ORDER, ROUTING_KEYS.ORDER.SHIPPED, payload);
    this.logger.log(`Published order.shipped event: orderId=${order.id}`);
  }
}
