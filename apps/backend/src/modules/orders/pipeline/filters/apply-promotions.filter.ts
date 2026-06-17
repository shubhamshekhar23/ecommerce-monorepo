import { Injectable } from '@nestjs/common';
import { RulesEngineService } from '@/modules/promotions/rules-engine.service';
import type { IOrderFilter } from '../order-filter.interface';
import type { OrderContext } from '../order-context';

@Injectable()
export class ApplyPromotionsFilter implements IOrderFilter {
  constructor(private readonly rulesEngine: RulesEngineService) {}

  async execute(ctx: OrderContext): Promise<void> {
    const rawSubtotal = ctx.cart.items.reduce(
      (sum, item) => sum + parseFloat(String(item.variant!.price)) * item.quantity,
      0,
    );
    const productIds = ctx.cart.items.map((i) => i.productId).filter(Boolean);
    const actions = await this.rulesEngine.evaluate(
      { subtotal: rawSubtotal, itemCount: ctx.cart.items.length, productIds },
      { tier: ctx.user.tier, orderCount: ctx.user.orderCount },
    );
    ctx.rawSubtotal = rawSubtotal;
    ctx.subtotal = this.rulesEngine.applyToSubtotal(rawSubtotal, actions);
    ctx.freeShipping = this.rulesEngine.hasFreeShipping(actions);
  }
}
