import { Injectable, BadRequestException } from '@nestjs/common';
import { BusinessMetricsService } from '@/modules/metrics/business-metrics.service';
import type { IOrderFilter } from '../order-filter.interface';
import type { OrderContext } from '../order-context';

@Injectable()
export class DecrementStockFilter implements IOrderFilter {
  constructor(private readonly businessMetrics: BusinessMetricsService) {}

  async execute(ctx: OrderContext): Promise<void> {
    for (const item of ctx.cart.items) {
      /*
       - Single atomic UPDATE ... WHERE stock >= qty eliminates the validate-then-update
       - race window even under ReadCommitted isolation. count === 0 means another
       - transaction consumed stock between our FOR UPDATE lock and now.
      */
      const result = await ctx.tx.productVariant.updateMany({
        where: { id: item.variantId!, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        this.businessMetrics.recordInventoryReservationFailure();
        throw new BadRequestException(
          `Insufficient stock for "${item.product?.name ?? item.variantId}"`,
        );
      }
    }
  }
}
