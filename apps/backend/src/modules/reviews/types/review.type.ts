import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class ReviewType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => String)
  userId!: string;

  @Field(() => Int)
  rating!: number;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  body!: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
