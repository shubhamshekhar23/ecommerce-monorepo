import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { OrderStatus, Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { OutboxService } from '@/modules/outbox/outbox.service';
import { CircuitBreakerService } from '@/modules/circuit-breaker/circuit-breaker.service';
import { PaymentConfirmedEvent } from '@/modules/events/order.events';

export interface PaymentRetryJobData {
  orderId: string;
  amount: number;
}

@Processor('payment-retry')
@Injectable()
export class PaymentRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentRetryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<PaymentRetryJobData>): Promise<void> {
    const { orderId, amount } = job.data;
    this.logger.log(`Retrying payment for orderId=${orderId} attempt=${job.attemptsMade}`);
    const intent = await this.circuitBreaker.createPaymentIntent(orderId, amount);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      this.eventEmitter.emit(
        PaymentConfirmedEvent.EVENT_NAME,
        new PaymentConfirmedEvent(orderId, order.userId, intent.id, new Date()),
      );
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<PaymentRetryJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;
    this.logger.error(`Payment retry exhausted for orderId=${job.data.orderId}: ${error.message}`);
    await this.cancelOrder(job.data.orderId);
  }

  private async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });
        if (!order) return;
        await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
        for (const item of order.items) {
          await tx.productVariant.updateMany({
            where: { productId: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await this.outbox.publish(tx, {
          aggregateId: orderId,
          aggregateType: 'Order',
          eventType: 'ORDER_CANCELLED',
          payload: { orderId, userId: order.userId, orderNumber: order.orderNumber },
        });
      });
    } catch (err) {
      this.logger.error(`Failed to cancel order ${orderId} after retry exhaustion`, err);
    }
  }
}
