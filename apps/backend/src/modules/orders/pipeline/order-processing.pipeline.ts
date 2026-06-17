/* eslint-disable max-params */
import { Injectable } from '@nestjs/common';
import type { OrderContext } from './order-context';
import type { OrderWithItems } from './order-types';
import type { IOrderFilter } from './order-filter.interface';
import { AcquireLocksFilter } from './filters/acquire-locks.filter';
import { ValidateStockFilter } from './filters/validate-stock.filter';
import { ApplyPromotionsFilter } from './filters/apply-promotions.filter';
import { CalculateTotalsFilter } from './filters/calculate-totals.filter';
import { CreateOrderFilter } from './filters/create-order.filter';
import { DecrementStockFilter } from './filters/decrement-stock.filter';
import { ClearCartFilter } from './filters/clear-cart.filter';
import { PublishEventsFilter } from './filters/publish-events.filter';

/*
 - Pipe-and-Filter: each filter receives the shared OrderContext, mutates it, and
 - passes control to the next. Steps are independently injectable and testable;
 - reordering is a single-line change to the filters array.
*/
@Injectable()
export class OrderProcessingPipeline {
  private readonly filters: IOrderFilter[];

  constructor(
    acquireLocks: AcquireLocksFilter,
    validateStock: ValidateStockFilter,
    applyPromotions: ApplyPromotionsFilter,
    calculateTotals: CalculateTotalsFilter,
    createOrder: CreateOrderFilter,
    decrementStock: DecrementStockFilter,
    clearCart: ClearCartFilter,
    publishEvents: PublishEventsFilter,
  ) {
    this.filters = [
      acquireLocks,
      validateStock,
      applyPromotions,
      calculateTotals,
      createOrder,
      decrementStock,
      clearCart,
      publishEvents,
    ];
  }

  async run(ctx: OrderContext): Promise<OrderWithItems> {
    for (const filter of this.filters) {
      await filter.execute(ctx);
    }
    return ctx.order!;
  }
}
