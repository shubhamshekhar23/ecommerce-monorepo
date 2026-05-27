/* eslint-disable max-lines */
import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { OrderSagaService } from './saga/order-saga.service';
import { calculatePagination, buildPaginationResponse } from '@/common/utils/pagination.util';
import { PaginationDto } from '@/common/types/pagination.interface';

// OrdersService is the public API for the orders domain.
// Heavy lifting (locking, stock, outbox, saga) lives in OrderSagaService.
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saga: OrderSagaService,
  ) {}

  async create(userId: string, cartId?: string): Promise<unknown> {
    const order = await this.saga.execute(userId, cartId);
    return this.mapToResponse(order);
  }

  async findById(orderId: string): Promise<unknown> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, user: true },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return this.mapToResponse(order);
  }

  async listUserOrders(userId: string, page = 1, limit = 20): Promise<PaginationDto<unknown>> {
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

    return buildPaginationResponse(orders.map((o) => this.mapToResponse(o)), total, page, limit);
  }

  async listAllOrders(page = 1, limit = 20): Promise<PaginationDto<unknown>> {
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

    return buildPaginationResponse(orders.map((o) => this.mapToResponse(o)), total, page, limit);
  }

  // eslint-disable-next-line max-lines-per-function
  async updateStatus(orderId: string, status: OrderStatus): Promise<unknown> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [OrderStatus.REFUNDED],
      [OrderStatus.REFUNDED]: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      throw new NotFoundException(`Cannot transition from ${order.status} to ${status}`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    return this.mapToResponse(updated);
  }

  // eslint-disable-next-line max-lines-per-function
  async cancelOrder(orderId: string, userId: string): Promise<unknown> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new NotFoundException('Order not found');

    const terminal: OrderStatus[] = [
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.REFUNDED,
    ];

    if (terminal.includes(order.status as (typeof terminal)[number])) {
      throw new NotFoundException(`Cannot cancel order with status ${order.status}`);
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

  // eslint-disable-next-line max-lines-per-function
  private mapToResponse(order: Record<string, unknown> & { items?: unknown[] }): unknown {
    return {
      id: order['id'],
      orderNumber: order['orderNumber'],
      userId: order['userId'],
      items: ((order['items'] ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: item['id'],
        productId: item['productId'],
        productName: (item['product'] as Record<string, unknown>)?.['name'],
        quantity: item['quantity'],
        price: item['price'],
        variantAttributes: item['variantAttributes'],
        subtotal: parseFloat(String(item['price'])) * (item['quantity'] as number),
      })),
      totalPrice: order['totalPrice'],
      status: order['status'],
      notes: order['notes'],
      createdAt: order['createdAt'],
      updatedAt: order['updatedAt'],
    };
  }
}
