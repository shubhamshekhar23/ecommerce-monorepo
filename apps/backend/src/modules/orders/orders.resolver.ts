import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { GqlCurrentUser } from '@/common/decorators';
import type { RequestUser } from '@/common/types/request-user.interface';
import { OrderQueryService } from './queries/order-query.service';
import { OrderType } from './types/order.type';

@Resolver(() => OrderType)
export class OrdersResolver {
  constructor(private readonly orderQueryService: OrderQueryService) {}

  @Query(() => [OrderType], { name: 'orders' })
  async findUserOrders(
    @GqlCurrentUser() user: RequestUser,
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
  ): Promise<OrderType[]> {
    const result = await this.orderQueryService.listUserOrders(user.id, page, limit);
    return result.data as unknown as OrderType[];
  }

  @Query(() => OrderType, { name: 'order' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<OrderType> {
    return this.orderQueryService.findById(id) as unknown as Promise<OrderType>;
  }
}
