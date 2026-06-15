import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AnalyticsOrderEvent } from '@ecommerce/shared-types';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { KafkaProducerService } from '@/modules/kafka/kafka-producer.service';
import { OrderCreatedEvent } from '@/modules/events/order.events';

const TOPIC = 'order.placed';

@Injectable()
export class OrderAnalyticsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaProducerService,
  ) {}

  @OnEvent(OrderCreatedEvent.EVENT_NAME)
  async handle(event: OrderCreatedEvent): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { items: true },
    });
    if (!order) return;

    const payload: AnalyticsOrderEvent = {
      orderId: order.id,
      userId: order.userId,
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: Number(i.price),
      })),
      totalAmount: Number(order.totalPrice),
      placedAt: order.createdAt.toISOString(),
    };

    await this.kafka.publish(TOPIC, payload);
  }
}
