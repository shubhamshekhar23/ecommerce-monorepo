/* eslint-disable max-params */
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';
import { OutboxService } from '@/modules/outbox/outbox.service';
import { PaymentService } from '@/modules/payments/payment.service';
import { CorrelationIdService } from '@/common/services/correlation-id.service';
import { OrderEventStore } from '../order-event-store.service';
import { OrderProcessingPipeline } from '../pipeline/order-processing.pipeline';
import { OrderContext } from '../pipeline/order-context';
import type { CartWithItems, OrderWithItems, UserForOrder } from '../pipeline/order-types';

/*
 - Why a Saga?
 - The order flow spans multiple resources: DB (create order + decrement stock),
 - an external payment API (Stripe), and a notification queue (outbox).
 - A saga coordinates these as discrete steps and defines compensating actions
 - for each step so that a partial failure can be cleanly rolled back — without
 - requiring a distributed 2-phase commit that locks every participant.
*/
@Injectable()
export class OrderSagaService {
  private readonly logger = new Logger(OrderSagaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly paymentService: PaymentService,
    private readonly correlationId: CorrelationIdService,
    private readonly orderEventStore: OrderEventStore,
    private readonly pipeline: OrderProcessingPipeline,
  ) {}

  async execute(userId: string, cartId?: string): Promise<OrderWithItems> {
    /*
     - S3: holds a DB connection inside a 30 s transaction on every request.
     - Under load the connection pool saturates; new requests hang waiting for a slot.
    */
    if (isBugScenario(3)) {
      await this.prisma.$transaction(async () => {
        await new Promise((r) => setTimeout(r, 30_000));
      });
    }

    /*
     - S7: simulates a slow external pre-auth call before the DB transaction.
     - Signal: Grafana P99 for POST /orders jumps ~3 s; other routes unaffected.
    */
    if (isBugScenario(7)) await new Promise((r) => setTimeout(r, 3_000));

    const [cart, user] = await Promise.all([this.loadCart(userId, cartId), this.loadUser(userId)]);
    this.validateCart(cart);

    const order = await this.runOrderTransaction(userId, cart, user);

    try {
      const charged = await this.paymentService.charge(
        order.id,
        parseFloat(String(order.totalPrice)),
      );
      if (!charged) this.logger.warn(`Payment queued for retry: orderId=${order.id}`);
    } catch (error) {
      await this.compensate(order);
      throw error;
    }

    await this.fanOutFulfillment(order);
    return order;
  }

  private async runOrderTransaction(
    userId: string,
    cart: CartWithItems,
    user: UserForOrder,
  ): Promise<OrderWithItems> {
    return this.prisma.$transaction(
      async (tx) => {
        const ctx = new OrderContext(tx, userId, cart, user);
        return this.pipeline.run(ctx);
      },
      { timeout: 10_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  /*
   - Fan-In: runs fulfillment steps in parallel with a 5 s timeout.
   - All steps are non-critical — the order is already committed and stock decremented
   - inside runOrderTransaction. Failures are logged but do not roll back the order.
   - FULFILLMENT_STARTED / FULFILLMENT_CONFIRMED events provide an explicit audit trail.
  */
  private async fanOutFulfillment(order: OrderWithItems): Promise<void> {
    await this.orderEventStore.append(order.id, 'FULFILLMENT_STARTED', {
      orderId: order.id,
      itemCount: order.items.length,
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Fulfillment timeout')), 5_000),
    );

    const [warehouseResult, analyticsResult] = await Promise.allSettled([
      Promise.race([this.notifyWarehouse(order), timeout]),
      Promise.race([this.publishFulfillmentAnalytics(order), timeout]),
    ]);

    for (const [name, result] of [
      ['warehouse', warehouseResult],
      ['analytics', analyticsResult],
    ] as const) {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Fan-in step failed: ${name} — ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    }

    await this.orderEventStore.append(order.id, 'FULFILLMENT_CONFIRMED', {
      orderId: order.id,
      warehouseNotified: warehouseResult.status === 'fulfilled',
      analyticsPublished: analyticsResult.status === 'fulfilled',
    });
  }

  private async notifyWarehouse(order: OrderWithItems): Promise<void> {
    await this.orderEventStore.append(order.id, 'WAREHOUSE_NOTIFIED', {
      orderNumber: order.orderNumber,
      itemCount: order.items.length,
    });
    this.logger.log(`Warehouse notified for order=${order.id}`);
  }

  private async publishFulfillmentAnalytics(order: OrderWithItems): Promise<void> {
    await this.orderEventStore.append(order.id, 'ANALYTICS_PUBLISHED', {
      totalPrice: parseFloat(String(order.totalPrice)),
      itemCount: order.items.length,
      correlationId: this.correlationId.get(),
    });
    this.logger.log(`Analytics published for order=${order.id}`);
  }

  private async compensate(order: OrderWithItems): Promise<void> {
    this.logger.warn(`Compensating order ${order.id} — Stripe charge failed`);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });
        for (const item of order.items) {
          await tx.productVariant.updateMany({
            where: { productId: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await this.outbox.publish(tx, {
          aggregateId: order.id,
          aggregateType: 'Order',
          eventType: 'ORDER_CANCELLED',
          payload: { orderId: order.id, userId: order.userId, orderNumber: order.orderNumber },
        });
        await this.orderEventStore.append(
          order.id,
          'ORDER_CANCELLED',
          { reason: 'payment_failed', from: 'PENDING', to: 'CANCELLED' },
          tx,
        );
      });
    } catch (compError) {
      this.logger.error(
        `Compensation failed for order ${order.id}: ${compError instanceof Error ? compError.message : String(compError)}`,
      );
    }
  }

  private async loadCart(userId: string, cartId?: string): Promise<CartWithItems> {
    const where = cartId ? { id: cartId } : { userId };
    const cart = await this.prisma.cart.findUnique({
      where,
      include: {
        items: {
          include: {
            product: { include: { category: true } },
            variant: {
              include: {
                attributeValues: { include: { option: { include: { variantType: true } } } },
              },
            },
          },
        },
      },
    });
    if (!cart) throw new BadRequestException('Cart not found');
    return cart;
  }

  private async loadUser(userId: string): Promise<UserForOrder> {
    const [user, orderCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          firstName: true,
          addresses: {
            where: { isDefault: true },
            select: { country: true, state: true },
            take: 1,
          },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    if (!user) throw new BadRequestException('User not found');
    return {
      email: user.email,
      firstName: user.firstName,
      country: user.addresses[0]?.country ?? 'US',
      state: user.addresses[0]?.state,
      orderCount,
      tier: 'FREE',
    };
  }

  private validateCart(cart: CartWithItems): void {
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');
  }
}
