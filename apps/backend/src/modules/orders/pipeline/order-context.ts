import { Prisma } from '@prisma/client';
import type { CartWithItems, OrderWithItems, UserForOrder } from './order-types';

export class OrderContext {
  subtotal = 0;
  rawSubtotal = 0;
  freeShipping = false;
  shippingCost = 0;
  taxAmount = 0;
  totalPrice = 0;
  order: OrderWithItems | null = null;

  constructor(
    public readonly tx: Prisma.TransactionClient,
    public readonly userId: string,
    public readonly cart: CartWithItems,
    public readonly user: UserForOrder,
  ) {}
}
