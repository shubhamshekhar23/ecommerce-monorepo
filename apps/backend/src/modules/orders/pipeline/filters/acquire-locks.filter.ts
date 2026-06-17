import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isBugScenario } from '@/modules/debug-scenarios/bug-scenario.guard';
import type { IOrderFilter } from '../order-filter.interface';
import type { OrderContext } from '../order-context';

/*
 - S18: removing .sort() breaks deterministic lock ordering → deadlocks under concurrent orders.
 - S10: sleep after acquiring locks holds them for 10 s, serialising concurrent orders.
*/
@Injectable()
export class AcquireLocksFilter implements IOrderFilter {
  async execute(ctx: OrderContext): Promise<void> {
    const rawIds = [...new Set(ctx.cart.items.map((i) => i.variantId).filter(Boolean))];
    const ids = isBugScenario(18) ? rawIds : rawIds.sort();
    for (const id of ids) {
      await ctx.tx.$queryRaw(
        Prisma.sql`SELECT id FROM "ProductVariant" WHERE id = ${id} FOR UPDATE`,
      );
    }
    if (isBugScenario(10)) await new Promise((r) => setTimeout(r, 10_000));
  }
}
