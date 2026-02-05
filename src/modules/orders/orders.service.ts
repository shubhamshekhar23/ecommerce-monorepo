/* eslint-disable max-lines */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { StripeService } from '@/modules/stripe/stripe.service';
import { OrderStatus } from '@prisma/client';
import { calculatePagination, buildPaginationResponse } from '@/common/utils/pagination.util';
import { PaginationDto } from '@/common/types/pagination.interface';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  // eslint-disable-next-line max-lines-per-function
  async create(userId: string, cartId?: string): Promise<any> {
    let cart = null;

    if (cartId) {
      cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: { include: { product: true } } },
      });
    } else {
      cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
      });
    }

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product ${item.product.name}`);
      }
    }

    const totalPrice = cart.items.reduce((sum, item) => {
      return sum + parseFloat(String(item.product.price)) * item.quantity;
    }, 0);

    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        totalPrice,
        status: OrderStatus.PENDING,
        items: {
          createMany: {
            data: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
      },
      include: { items: { include: { product: true } } },
    });

    for (const item of cart.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    try {
      await this.stripeService.createPaymentIntent(order.id, parseFloat(String(order.totalPrice)));
    } catch {
      // Payment intent creation failed, but order was created
      // Client can retry creating payment intent later
    }

    return this.mapToResponse(order);
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

    if (unCancellableStatuses.includes(order.status as any)) {
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
    const now = new Date();
    const timestamp = now
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
