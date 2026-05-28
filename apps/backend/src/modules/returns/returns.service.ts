import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { OrderStatus, ReturnStatus } from '@prisma/client';

// State machine + compensating transactions:
//
// ReturnRequest states:  PENDING → APPROVED → REFUNDED
//                        PENDING → REJECTED
//
// When APPROVED → REFUNDED, the compensating transaction runs:
//   1. Issue Stripe refund (compensates the original charge)
//   2. Restock inventory (compensates the stock decrement from order fulfillment)
//   3. Mark order status REFUNDED
//
// If the Stripe refund fails, the return stays APPROVED (not REFUNDED) so
// it can be retried. The outbox pattern would be the production-grade solution here.

const REFUNDABLE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.SHIPPED];

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReturnDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new NotFoundException('Order not found');
    if (!REFUNDABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(`Cannot return order with status ${order.status}`);
    }

    return this.prisma.returnRequest.create({
      data: {
        id: crypto.randomUUID(),
        orderId: dto.orderId,
        userId,
        reason: dto.reason,
        updatedAt: new Date(),
        items: {
          create: dto.items.map((item) => ({
            id: crypto.randomUUID(),
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: item.reason,
          })),
        },
      },
      include: { items: true },
    });
  }

  async approve(returnId: string) {
    return this.prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: ReturnStatus.APPROVED, updatedAt: new Date() },
    });
  }

  async reject(returnId: string, reason: string) {
    return this.prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: ReturnStatus.REJECTED, reason, updatedAt: new Date() },
    });
  }

  // Compensating transaction: Stripe refund + restock + mark order REFUNDED.
  // In production this would use the Outbox pattern for guaranteed execution.
  async processRefund(returnId: string, stripeService: { refund: (paymentIntentId: string) => Promise<{ id: string }> }) {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { order: { include: { items: true } }, items: true },
    });
    if (!request) throw new NotFoundException('Return request not found');
    if (request.status !== ReturnStatus.APPROVED) {
      throw new BadRequestException('Return must be approved before refund');
    }
    if (!request.order.paymentIntentId) {
      throw new BadRequestException('No payment intent found on order');
    }

    const refund = await stripeService.refund(request.order.paymentIntentId);

    await this.prisma.$transaction([
      this.prisma.returnRequest.update({
        where: { id: returnId },
        data: { status: ReturnStatus.REFUNDED, refundId: refund.id, updatedAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: request.orderId },
        data: { status: OrderStatus.REFUNDED },
      }),
      // Restock each returned item
      ...request.items.map((item: { orderItemId: string; quantity: number }) => {
        const orderItem = request.order.items.find((oi: { id: string; productId: string }) => oi.id === item.orderItemId);
        return this.prisma.product.update({
          where: { id: orderItem?.productId ?? '' },
          data: { stock: { increment: item.quantity } },
        });
      }),
    ]);

    return refund;
  }

  async listByUser(userId: string) {
    return this.prisma.returnRequest.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
