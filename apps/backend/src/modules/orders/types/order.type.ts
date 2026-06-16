import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class OrderItemType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => String)
  productName!: string;

  @Field(() => String, { nullable: true })
  categoryName!: string | null;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String)
  price!: string;
}

@ObjectType()
export class OrderType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  orderNumber!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  paymentStatus!: string;

  @Field(() => String)
  totalPrice!: string;

  @Field(() => Int)
  itemCount!: number;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}
