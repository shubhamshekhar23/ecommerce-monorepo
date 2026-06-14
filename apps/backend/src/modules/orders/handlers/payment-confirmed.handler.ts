import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { PaymentConfirmedEvent, OrderStatusChangedEvent } from '@/modules/events/order.events';

// When Stripe confirms payment, auto-transition order status PENDING → CONFIRMED
// and emit OrderStatusChangedEvent so downstream handlers (read model, notifications)
// react without knowing anything about Stripe.
@Injectable()
export class PaymentConfirmedHandler {
  private readonly logger = new Logger(PaymentConfirmedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(PaymentConfirmedEvent.EVENT_NAME)
  async handle(event: PaymentConfirmedEvent): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: event.orderId } });
    if (!order || order.status !== OrderStatus.PENDING) return;

    await this.prisma.order.update({
      where: { id: event.orderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    this.eventEmitter.emit(
      OrderStatusChangedEvent.EVENT_NAME,
      new OrderStatusChangedEvent(
        event.orderId,
        event.userId,
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        new Date(),
      ),
    );
    this.logger.log(`Order ${event.orderId} auto-confirmed after payment`);
  }
}
