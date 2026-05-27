import { OrderStatus } from '@prisma/client';

export class OrderCreatedEvent {
  static readonly EVENT_NAME = 'order.created';

  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly orderNumber: string,
    public readonly totalPrice: string,
    public readonly itemCount: number,
    public readonly createdAt: Date,
  ) {}
}

export class OrderStatusChangedEvent {
  static readonly EVENT_NAME = 'order.status_changed';

  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly previousStatus: OrderStatus,
    public readonly newStatus: OrderStatus,
    public readonly updatedAt: Date,
  ) {}
}

export class PaymentConfirmedEvent {
  static readonly EVENT_NAME = 'payment.confirmed';

  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly stripePaymentIntentId: string,
    public readonly confirmedAt: Date,
  ) {}
}
