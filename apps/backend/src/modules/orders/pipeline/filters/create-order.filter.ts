import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import type { IOrderFilter } from '../order-filter.interface';
import type { OrderContext } from '../order-context';

@Injectable()
export class CreateOrderFilter implements IOrderFilter {
  async execute(ctx: OrderContext): Promise<void> {
    ctx.order = await ctx.tx.order.create({
      data: this.buildOrderData(ctx),
      include: { items: { include: { product: true } } },
    });
  }

  private buildOrderData(ctx: OrderContext) {
    return {
      orderNumber: this.generateOrderNumber(),
      userId: ctx.userId,
      subtotal: ctx.subtotal,
      totalPrice: ctx.totalPrice,
      shippingCost: ctx.shippingCost,
      taxAmount: ctx.taxAmount,
      status: OrderStatus.PENDING,
      items: {
        createMany: {
          data: ctx.cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.variant!.price,
            variantAttributes: this.buildAttributeSnapshot(item.variant),
            categoryName: item.product.category?.name ?? null,
          })),
        },
      },
    };
  }

  private generateOrderNumber(): string {
    const ts = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .substring(0, 14);
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${ts}-${rand}`;
  }

  private buildAttributeSnapshot(variant: any): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const av of variant?.attributeValues ?? []) {
      const typeName = av.option?.variantType?.name ?? 'Attribute';
      attrs[typeName] = av.option?.value ?? '';
    }
    return attrs;
  }
}
