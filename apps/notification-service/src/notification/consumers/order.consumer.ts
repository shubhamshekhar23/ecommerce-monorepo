import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EXCHANGES, QUEUES, ROUTING_KEYS } from '@ecommerce/shared-types';
import type { OrderPlacedEvent, OrderShippedEvent } from '@ecommerce/shared-types';

// @RabbitSubscribe wires the method to a RabbitMQ queue at startup.
// exchange + routingKey define which messages are routed here.
// queue is the durable queue that buffers messages when this service is down.
// If this service is down when an order is placed, the message waits in the queue
// and is delivered when the service comes back up — this is the key advantage over
// in-process BullMQ workers.
@Injectable()
export class OrderConsumer {
  private readonly logger = new Logger(OrderConsumer.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.ORDER,
    routingKey: ROUTING_KEYS.ORDER.PLACED,
    queue: QUEUES.ORDER_NOTIFICATIONS,
    queueOptions: { durable: true },
  })
  async handleOrderPlaced(event: OrderPlacedEvent): Promise<void | Nack> {
    /*
     - S14: consumer sleeps 5 s per message — processes 12 msg/min instead of hundreds.
     - Under order load the RabbitMQ queue depth grows; emails arrive minutes late.
     - Signal: RabbitMQ UI messages_ready climbs; Loki shows slow consumer throughput.
    */
    if (process.env.BUG_SCENARIO === '14') await new Promise((r) => setTimeout(r, 5_000));

    this.logger.log(`Order placed event: orderId=${event.orderId} email=${event.userEmail}`);

    try {
      await this.mailerService.sendMail({
        to: event.userEmail,
        subject: 'Order Confirmation',
        template: 'order-confirmation',
        context: {
          firstName: event.firstName || 'Customer',
          orderNumber: event.orderNumber,
          orderDate: new Date(event.createdAt).toLocaleDateString(),
          status: 'CONFIRMED',
          items: event.items,
          total: event.totalPrice.toFixed(2),
          appUrl: this.config.get('app.url'),
        },
      });

      this.logger.log(`Confirmation email sent: orderId=${event.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to send confirmation email: orderId=${event.orderId}`, error);
      // Nack with requeue=false sends the message to the dead letter queue (DLQ).
      // Requeue=true would retry immediately and risk an infinite loop on a
      // broken template or invalid address — so we let the DLQ handle retries.
      return new Nack(false);
    }
  }

  @RabbitSubscribe({
    exchange: EXCHANGES.ORDER,
    routingKey: ROUTING_KEYS.ORDER.SHIPPED,
    queue: `${QUEUES.ORDER_NOTIFICATIONS}.shipped`,
    queueOptions: { durable: true },
  })
  async handleOrderShipped(event: OrderShippedEvent): Promise<void | Nack> {
    this.logger.log(`Order shipped event: orderId=${event.orderId}`);

    try {
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

      await this.mailerService.sendMail({
        to: event.userEmail,
        subject: 'Your Order Has Shipped',
        template: 'order-shipped',
        context: {
          firstName: event.firstName || 'Customer',
          orderNumber: event.orderNumber,
          trackingNumber: event.trackingNumber,
          carrier: event.carrier,
          estimatedDelivery: estimatedDelivery.toLocaleDateString(),
          shippingAddress: event.shippingAddress,
          trackingUrl: `https://tracking.example.com/${event.trackingNumber}`,
          appUrl: this.config.get('app.url'),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send shipped email: orderId=${event.orderId}`, error);
      return new Nack(false);
    }
  }
}
