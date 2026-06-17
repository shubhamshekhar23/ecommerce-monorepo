import { Injectable } from '@nestjs/common';
import type { IOrderFilter } from '../order-filter.interface';
import type { OrderContext } from '../order-context';

@Injectable()
export class ClearCartFilter implements IOrderFilter {
  async execute(ctx: OrderContext): Promise<void> {
    await ctx.tx.cartItem.deleteMany({ where: { cartId: ctx.cart.id } });
  }
}
