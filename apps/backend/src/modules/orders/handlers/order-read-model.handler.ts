import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CacheService } from '@/modules/cache/cache.service';
import { OrderCreatedEvent, OrderStatusChangedEvent } from '@/modules/events/order.events';
import { mapToOrderReadModel } from '../read-models/order-read-model.mapper';

const READ_MODEL_TTL = 3600;

@Injectable()
export class OrderReadModelHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @OnEvent(OrderCreatedEvent.EVENT_NAME)
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    await this.projectOrder(event.orderId);
  }

  @OnEvent(OrderStatusChangedEvent.EVENT_NAME)
  async handleStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    await this.projectOrder(event.orderId);
  }

  private async projectOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) return;
    await this.cache.set(`read:order:${orderId}`, mapToOrderReadModel(order), READ_MODEL_TTL);
  }
}
