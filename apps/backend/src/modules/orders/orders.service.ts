/* eslint-disable max-lines */
import { Prisma } from '@prisma/client';
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { StripeService } from '@/modules/stripe/stripe.service';
import { MailService } from '@/modules/mail/mail.service';
import { OrderStatus } from '@prisma/client';
import { calculatePagination, buildPaginationResponse } from '@/common/utils/pagination.util';
import { PaginationDto } from '@/common/types/pagination.interface';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly mailService: MailService,
  ) {}

  // eslint-disable-next-line max-lines-per-function,complexity
  async create(userId: string, cartId?: string): Promise<any> {
    const cart = await this.loadCart(userId, cartId);

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const order = await this.createOrderWithPessimisticLock(userId, cart);

    await this.postOrderSideEffects(order, userId);

    return this.mapToResponse(order);
  }

  // Pessimistic locking prevents oversell under concurrent requests.
  //
  // The bug without locking:
  //   Thread A reads stock=1, Thread B reads stock=1 → both pass the check
  //   → both decrement → stock=-1 (oversell!)
  //
  // With SELECT FOR UPDATE:
  //   Thread A acquires the row-level lock.
  //   Thread B blocks at the FOR UPDATE until A commits.
  //   After A commits (stock=0), B reads stock=0 → throws InsufficientStock.
  //
  // Concurrency demo: fire 10 concurrent POST /orders requests with 1 item in stock.
  // Without FOR UPDATE: all 10 succeed. With it: exactly 1 succeeds.
  //
  // Prisma interactive transactions let you mix $queryRaw and ORM calls in one txn.
  // eslint-disable-next-line max-lines-per-function
  private async createOrderWithPessimisticLock(userId: string, cart: any): Promise<any> {
    return this.prisma.$transaction(
      async (tx) => {
        // Acquire row-level locks on all products in the cart.
        // All locks are acquired upfront (sorted by id) to prevent deadlocks when two
        // concurrent carts overlap on the same products in different orders.
        const sortedProductIds = [
          ...new Set(cart.items.map((i: any) => i.productId as string)),
        ].sort();

        for (const productId of sortedProductIds) {
          await tx.$queryRaw(
            Prisma.sql`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`,
          );
        }

        // Re-read stock inside the transaction — the values are now locked and consistent.
        for (const item of cart.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.stock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product "${item.product?.name ?? item.productId}"`,
            );
          }
        }

        const totalPrice = cart.items.reduce((sum: number, item: any) => {
          return sum + parseFloat(String(item.product.price)) * item.quantity;
        }, 0);

        const order = await tx.order.create({
          data: {
            orderNumber: this.generateOrderNumber(),
            userId,
            totalPrice,
            status: OrderStatus.PENDING,
            items: {
              createMany: {
                data: cart.items.map((item: any) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.product.price,
                })),
              },
            },
          },
          include: { items: { include: { product: true } } },
        });

        // Decrement stock for all cart items inside the same transaction.
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return order;
      },
      {
        // 10s timeout is enough for typical order sizes; prevents long-held locks
        timeout: 10_000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );
  }

  private async loadCart(userId: string, cartId?: string): Promise<any> {
    const where = cartId ? { id: cartId } : { userId };
    return this.prisma.cart.findUnique({
      where,
      include: { items: { include: { product: true } } },
    });
  }

  private async postOrderSideEffects(order: any, userId: string): Promise<void> {
    try {
      await this.stripeService.createPaymentIntent(order.id, parseFloat(String(order.totalPrice)));
    } catch (error) {
      this.logger.error(
        `Failed to create payment intent for order ${order.id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const items = order.items.map((item: any) => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: parseFloat(String(item.price)),
        }));
        const shippingAddress = {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          addressLine1: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        };
        await this.mailService.sendOrderConfirmation(order, user, items, shippingAddress);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findById(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, user: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.mapToResponse(order);
  }

  async listUserOrders(userId: string, page = 1, limit = 20): Promise<PaginationDto<any>> {
    const { skip, take } = calculatePagination(page, limit);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return buildPaginationResponse(
      orders.map((o) => this.mapToResponse(o)),
      total,
      page,
      limit,
    );
  }

  async listAllOrders(page = 1, limit = 20): Promise<PaginationDto<any>> {
    const { skip, take } = calculatePagination(page, limit);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take,
        include: { items: { include: { product: true } }, user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);

    return buildPaginationResponse(
      orders.map((o) => this.mapToResponse(o)),
      total,
      page,
      limit,
    );
  }

  // eslint-disable-next-line max-lines-per-function
  async updateStatus(orderId: string, status: OrderStatus): Promise<any> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const validTransitions: { [key in OrderStatus]: OrderStatus[] } = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${status}`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    return this.mapToResponse(updated);
  }

  // eslint-disable-next-line max-lines-per-function
  async cancelOrder(orderId: string, userId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Unauthorized to cancel this order');
    }

    const unCancellableStatuses = [
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
    ];

    if (unCancellableStatuses.includes(order.status as 'SHIPPED' | 'DELIVERED' | 'REFUNDED')) {
      throw new BadRequestException(`Cannot cancel order with status ${order.status}`);
    }

    for (const item of order.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: { items: { include: { product: true } } },
    });

    return this.mapToResponse(updated);
  }

  private generateOrderNumber(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .substring(0, 14);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${timestamp}-${random}`;
  }

  // eslint-disable-next-line max-lines-per-function
  private mapToResponse(order: any): any {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      items:
        order.items?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name,
          quantity: item.quantity,
          price: item.price,
          variantAttributes: item.variantAttributes,
          subtotal: parseFloat(String(item.price)) * item.quantity,
        })) || [],
      totalPrice: order.totalPrice,
      status: order.status,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
