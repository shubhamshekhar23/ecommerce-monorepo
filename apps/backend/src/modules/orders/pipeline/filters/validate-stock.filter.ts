import { Injectable, BadRequestException } from '@nestjs/common';
import { BusinessMetricsService } from '@/modules/metrics/business-metrics.service';
import type { IOrderFilter } from '../order-filter.interface';
import type { OrderContext } from '../order-context';

@Injectable()
export class ValidateStockFilter implements IOrderFilter {
  constructor(private readonly businessMetrics: BusinessMetricsService) {}

  async execute(ctx: OrderContext): Promise<void> {
    for (const item of ctx.cart.items) {
      const variant = await ctx.tx.productVariant.findUnique({ where: { id: item.variantId! } });
      if (!variant || variant.stock < item.quantity) {
        this.businessMetrics.recordInventoryReservationFailure();
        throw new BadRequestException(
          `Insufficient stock for "${item.product?.name ?? item.variantId}"`,
        );
      }
    }
  }
}
