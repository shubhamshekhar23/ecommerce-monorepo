import { Injectable } from '@nestjs/common';
import { ShippingService } from '@/modules/shipping/shipping.service';
import { TaxService } from '@/modules/tax/tax.service';
import type { IOrderFilter } from '../order-filter.interface';
import type { OrderContext } from '../order-context';

@Injectable()
export class CalculateTotalsFilter implements IOrderFilter {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly taxService: TaxService,
  ) {}

  async execute(ctx: OrderContext): Promise<void> {
    const totalWeightKg = ctx.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const shipping = this.shippingService.selectStrategy(
      ctx.rawSubtotal,
      totalWeightKg,
      ctx.user.country,
    );
    const tax = this.taxService.calculate({
      country: ctx.user.country,
      state: ctx.user.state,
      subtotal: ctx.subtotal,
    });
    ctx.shippingCost = ctx.freeShipping ? 0 : shipping.cost;
    ctx.taxAmount = tax.amount;
    ctx.totalPrice = ctx.subtotal + ctx.shippingCost + ctx.taxAmount;
  }
}
