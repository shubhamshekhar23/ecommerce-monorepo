import type { OrderContext } from './order-context';

export interface IOrderFilter {
  execute(ctx: OrderContext): Promise<void>;
}
