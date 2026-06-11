/* eslint-disable max-lines */
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';
import { OutboxService } from '@/modules/outbox/outbox.service';
import { CircuitBreakerService } from '@/modules/circuit-breaker/circuit-breaker.service';
import { BusinessMetricsService } from '@/modules/metrics/business-metrics.service';
import { CorrelationIdService } from '@/common/services/correlation-id.service';
import type { NotificationJobPayload } from '@/modules/queue/dto/notification-job.dto';

type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: { product: true; variant: true } } };
}>;
type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;
type UserForNotification = { email: string; firstName: string | null };

// Why a Saga?
// The order flow spans multiple resources: DB (create order + decrement stock),
// an external payment API (Stripe), and a notification queue (outbox).
// A saga coordinates these as discrete steps and defines compensating actions
// for each step so that a partial failure can be cleanly rolled back — without
// requiring a distributed 2-phase commit that locks every participant.
@Injectable()
export class OrderSagaService {
  private readonly logger = new Logger(OrderSagaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly businessMetrics: BusinessMetricsService,
    private readonly correlationId: CorrelationIdService,
  ) {}

  async execute(userId: string, cartId?: string): Promise<OrderWithItems> {
    /*
     - S3: holds a DB connection inside a 30 s transaction on every request.
     - Under load the connection pool saturates; new requests hang waiting for a slot.
     - Signal: pgbouncer_pools_client_waiting_count climbs; Jaeger spans start but have no DB children.
    */
    if (isBugScenario(3)) {
      await this.prisma.$transaction(async () => {
        await new Promise((r) => setTimeout(r, 30_000));
      });
    }

    /*
     - S7: simulates a slow external pre-auth call before the DB transaction.
     - Signal: Grafana P99 for POST /orders jumps ~3 s; other routes unaffected.
     - Jaeger: 3 s gap between HTTP span start and first DB child span.
    */
    if (isBugScenario(7)) await new Promise((r) => setTimeout(r, 3_000));

    const [cart, user] = await Promise.all([
      this.loadCart(userId, cartId),
      this.loadUser(userId),
    ]);

    this.validateCart(cart);

    const order = await this.runOrderTransaction(userId, cart, user);

    try {
      await this.circuitBreaker.createPaymentIntent(
        order.id,
        parseFloat(String(order.totalPrice)),
      );
    } catch (error) {
      await this.compensate(order);
      throw error;
    }

    return order;
  }

  private async runOrderTransaction(
    userId: string,
    cart: CartWithItems,
    user: UserForNotification,
  ): Promise<OrderWithItems> {
    return this.prisma.$transaction(
      async (tx) => {
        await this.acquireVariantLocks(tx, cart);
        await this.validateStock(tx, cart);
        const order = await this.createOrderRecord(tx, userId, cart);
        await this.decrementStock(tx, cart);
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await this.publishOrderCreatedEvent(tx, order, user, cart);
        return order;
      },
      { timeout: 10_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  private async acquireVariantLocks(
    tx: Prisma.TransactionClient,
    cart: CartWithItems,
  ): Promise<void> {
    /*
     - S18: removing .sort() breaks deterministic lock ordering.
     - Two concurrent orders for the same variants in different item sequences deadlock each other.
     - Signal: Loki shows "deadlock detected"; Grafana brief error spike then recovery.
     - S10: sleep after acquiring locks holds them for 10 s, serialising concurrent orders.
     - Signal: Jaeger shows requests queuing sequentially; latency spikes under concurrent load.
    */
    const rawIds = [...new Set(cart.items.map((i) => i.variantId).filter(Boolean))];
    const ids = isBugScenario(18) ? rawIds : rawIds.sort();
    for (const id of ids) {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "ProductVariant" WHERE id = ${id} FOR UPDATE`);
    }
    if (isBugScenario(10)) await new Promise((r) => setTimeout(r, 10_000));
  }

  private async validateStock(
    tx: Prisma.TransactionClient,
    cart: CartWithItems,
  ): Promise<void> {
    for (const item of cart.items) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId! } });
      if (!variant || variant.stock < item.quantity) {
        this.businessMetrics.recordInventoryReservationFailure();
        throw new BadRequestException(
          `Insufficient stock for "${item.product?.name ?? item.variantId}"`,
        );
      }
    }
  }

  private async createOrderRecord(
    tx: Prisma.TransactionClient,
    userId: string,
    cart: CartWithItems,
  ): Promise<OrderWithItems> {
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + parseFloat(String(item.variant!.price)) * item.quantity,
      0,
    );

    return tx.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId,
        totalPrice,
        status: OrderStatus.PENDING,
        items: {
          createMany: {
            data: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.variant!.price,
              // Snapshot variant attributes at purchase time — immutable after order placed
              variantAttributes: this.buildAttributeSnapshot(item.variant),
            })),
          },
        },
      },
      include: { items: { include: { product: true } } },
    });
  }

  private buildAttributeSnapshot(variant: any): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const av of variant?.attributeValues ?? []) {
      const typeName = av.option?.variantType?.name ?? 'Attribute';
      attrs[typeName] = av.option?.value ?? '';
    }
    return attrs;
  }

  private async decrementStock(
    tx: Prisma.TransactionClient,
    cart: CartWithItems,
  ): Promise<void> {
    for (const item of cart.items) {
      await tx.productVariant.update({
        where: { id: item.variantId! },
        data: { stock: { decrement: item.quantity } },
      });
    }
  }

  private async publishOrderCreatedEvent(
    tx: Prisma.TransactionClient,
    order: OrderWithItems,
    user: UserForNotification,
    cart: CartWithItems,
  ): Promise<void> {
    const payload: NotificationJobPayload = {
      type: 'order-confirmation',
      orderId: order.id,
      userId: order.userId,
      userEmail: user.email,
      firstName: user.firstName ?? '',
      orderNumber: order.orderNumber,
      totalPrice: parseFloat(String(order.totalPrice)),
      items: cart.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        price: parseFloat(String(i.variant!.price)),
      })),
      createdAt: order.createdAt.toISOString(),
      correlationId: this.correlationId.get(),
    };

    await this.outbox.publish(tx, {
      aggregateId: order.id,
      aggregateType: 'Order',
      eventType: 'ORDER_CREATED',
      payload: payload as unknown as Prisma.InputJsonValue,
    });
  }

  // Compensating transaction: restores variant stock when the Stripe call fails.
  private async compensate(order: OrderWithItems): Promise<void> {
    this.logger.warn(`Compensating order ${order.id} — Stripe charge failed`);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });

        for (const item of order.items) {
          // Restore via productId — find the variant that was decremented from the snapshot
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
            product: true,
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

  private async loadUser(userId: string): Promise<UserForNotification> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }

  private validateCart(cart: CartWithItems): void {
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');
  }

  private generateOrderNumber(): string {
    const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${ts}-${rand}`;
  }
}
