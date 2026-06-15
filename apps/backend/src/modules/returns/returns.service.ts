import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { StripeService } from '@/modules/stripe/stripe.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { OrderStatus, ReturnStatus } from '@prisma/client';

/*
 - State machine + compensating transactions:
 -
 - ReturnRequest states:  PENDING → APPROVED → REFUNDED
 -                        PENDING → REJECTED
 -
 - When APPROVED → REFUNDED, the compensating transaction runs:
 -   1. Issue Stripe refund (compensates the original charge)
 -   2. Restock inventory (compensates the stock decrement from order fulfillment)
 -   3. Mark order status REFUNDED
 -
 - If the Stripe refund fails, the return stays APPROVED (not REFUNDED) so
 - it can be retried. The outbox pattern would be the production-grade solution here.
 */

const REFUNDABLE_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.SHIPPED];

interface RestockSource {
  items: Array<{ orderItemId: string; quantity: number }>;
  order: { items: Array<{ id: string; productId: string; variantId: string | null }> };
}

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly stripeService: StripeService,
  ) {}

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
    const request = await this.prisma.returnRequest.findUnique({ where: { id: returnId } });
    if (!request) throw new NotFoundException('Return request not found');
    if (request.status !== ReturnStatus.PENDING) {
      throw new BadRequestException('Only PENDING return requests can be approved');
    }
    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: ReturnStatus.APPROVED, updatedAt: new Date() },
    });
    void this.auditService.log({
      action: 'RETURN_APPROVED',
      entity: 'ReturnRequest',
      entityId: returnId,
      before: { status: ReturnStatus.PENDING },
      after: { status: ReturnStatus.APPROVED },
    });
    return updated;
  }

  async reject(returnId: string, reason: string) {
    const request = await this.prisma.returnRequest.findUnique({ where: { id: returnId } });
    if (!request) throw new NotFoundException('Return request not found');
    if (request.status !== ReturnStatus.PENDING) {
      throw new BadRequestException('Only PENDING return requests can be rejected');
    }
    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: ReturnStatus.REJECTED, reason, updatedAt: new Date() },
    });
    void this.auditService.log({
      action: 'RETURN_REJECTED',
      entity: 'ReturnRequest',
      entityId: returnId,
      before: { status: ReturnStatus.PENDING },
      after: { status: ReturnStatus.REJECTED },
    });
    return updated;
  }

  async processRefund(returnId: string): Promise<{ id: string }> {
    const request = await this.fetchApprovedRequest(returnId);
    const refund = await this.stripeService.createRefund(request.order.paymentIntentId!);
    await this.prisma.$transaction([
      this.prisma.returnRequest.update({
        where: { id: returnId },
        data: { status: ReturnStatus.REFUNDED, refundId: refund.id, updatedAt: new Date() },
      }),
      this.prisma.order.update({
        where: { id: request.orderId },
        data: { status: OrderStatus.REFUNDED },
      }),
      ...this.buildRestockOperations(request),
    ]);
    void this.auditService.log({
      action: 'RETURN_REFUNDED',
      entity: 'ReturnRequest',
      entityId: returnId,
      after: { status: ReturnStatus.REFUNDED, refundId: refund.id },
    });
    return refund;
  }

  async listByUser(userId: string) {
    return this.prisma.returnRequest.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async fetchApprovedRequest(returnId: string) {
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
    return request;
  }

  private buildRestockOperations(request: RestockSource) {
    return request.items.map((item) => {
      const orderItem = request.order.items.find((oi) => oi.id === item.orderItemId);
      if (orderItem?.variantId) {
        return this.prisma.productVariant.update({
          where: { id: orderItem.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
      /*
       - Legacy order (pre-migration): variantId is null, fall back to product-level restock.
       - New orders always have variantId set via order-saga.service.ts.
       */
      return this.prisma.productVariant.updateMany({
        where: { productId: orderItem?.productId ?? '' },
        data: { stock: { increment: item.quantity } },
      });
    });
  }
}
