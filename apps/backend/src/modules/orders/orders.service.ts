/* eslint-disable max-lines */
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { OrderSagaService } from './saga/order-saga.service';
import { calculatePagination, buildPaginationResponse } from '@/common/utils/pagination.util';
import { PaginationDto } from '@/common/types/pagination.interface';
import { OrderCreatedEvent, OrderStatusChangedEvent } from '@/modules/events/order.events';
import { BusinessMetricsService } from '@/modules/metrics/business-metrics.service';
import { AuditService } from '@/modules/audit/audit.service';
import { OrderResponseDto, OrderItemResponseDto } from './dto/order-response.dto';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;

// OrdersService is the public API for the orders domain.
// Heavy lifting (locking, stock, outbox, saga) lives in OrderSagaService.
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saga: OrderSagaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly businessMetrics: BusinessMetricsService,
    private readonly auditService: AuditService,
  ) {}

  async create(userId: string, cartId?: string): Promise<OrderResponseDto> {
    /*
     - S9: deterministic per-user failure — ~20% of users always fail, others never do.
     - Signal: Grafana error rate ~20% not 100%; Loki errors cluster on same userId pattern.
    */
    if (isBugScenario(9) && userId.charCodeAt(0) % 5 === 0) {
      throw new InternalServerErrorException('Order processing failed');
    }

    const order = await this.saga.execute(userId, cartId);
    this.businessMetrics.recordOrder('PENDING');
    this.eventEmitter.emit(
      OrderCreatedEvent.EVENT_NAME,
      new OrderCreatedEvent(
        order.id,
        order.userId,
        order.orderNumber,
        String(order.totalPrice),
        order.items.length,
        order.createdAt,
      ),
    );
    return this.mapToResponse(order);
  }

  async findById(orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, user: true },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return this.mapToResponse(order);
  }

  async listUserOrders(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginationDto<OrderResponseDto>> {
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

  async listAllOrders(page = 1, limit = 20): Promise<PaginationDto<OrderResponseDto>> {
    const { skip, take } = calculatePagination(page, limit);

    /*
     - S15: simulate a missing-index full-table scan with pg_sleep per row.
     - Signal: Jaeger shows one long DB span; PgAdmin EXPLAIN shows Seq Scan.
    */
    if (isBugScenario(15)) {
      await this.prisma.$queryRaw`
        SELECT id FROM "Order" WHERE notes ILIKE ${'%urgent%'} AND pg_sleep(0.05) IS NOT NULL LIMIT 1
      `;
    }

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
  async updateStatus(orderId: string, status: OrderStatus): Promise<OrderResponseDto> {
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

    this.businessMetrics.recordOrder(status);
    this.eventEmitter.emit(
      OrderStatusChangedEvent.EVENT_NAME,
      new OrderStatusChangedEvent(orderId, order.userId, order.status, status, updated.updatedAt),
    );
    void this.auditService.log({
      action: 'ORDER_STATUS_CHANGED',
      userId: order.userId,
      entity: 'Order',
      entityId: orderId,
      before: { status: order.status },
      after: { status },
    });
    return this.mapToResponse(updated);
  }

  // eslint-disable-next-line max-lines-per-function
  async cancelOrder(orderId: string, userId: string): Promise<OrderResponseDto> {
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
      await this.prisma.productVariant.updateMany({
        where: { productId: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      include: { items: { include: { product: true } } },
    });

    this.eventEmitter.emit(
      OrderStatusChangedEvent.EVENT_NAME,
      new OrderStatusChangedEvent(
        orderId,
        order.userId,
        order.status,
        OrderStatus.CANCELLED,
        updated.updatedAt,
      ),
    );
    return this.mapToResponse(updated);
  }

  // eslint-disable-next-line max-lines-per-function
  private mapToResponse(order: OrderWithItems): OrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      items: order.items.map(
        (item): OrderItemResponseDto => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? null,
          quantity: item.quantity,
          price: String(item.price),
          variantAttributes: item.variantAttributes as Record<string, string> | null,
          subtotal: parseFloat(String(item.price)) * item.quantity,
        }),
      ),
      shippingCost:
        order.shippingCost !== null && order.shippingCost !== undefined
          ? String(order.shippingCost)
          : null,
      totalPrice: String(order.totalPrice),
      status: order.status,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
