import { ObjectType, Field, Float, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class ProductImageType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  url!: string;

  @Field(() => String, { nullable: true })
  altText!: string | null;

  @Field(() => Boolean)
  isMain!: boolean;

  @Field(() => Int)
  order!: number;
}

@ObjectType()
export class ProductPriceRangeType {
  @Field(() => Float, { nullable: true })
  min!: number | null;

  @Field(() => Float, { nullable: true })
  max!: number | null;
}

@ObjectType()
export class ProductType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ProductPriceRangeType)
  priceRange!: ProductPriceRangeType;

  @Field(() => String)
  categoryId!: string;

  @Field(() => String, { nullable: true })
  categoryName!: string | null;

  @Field(() => [ProductImageType])
  images!: ProductImageType[];

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Float, { nullable: true })
  avgRating!: number | null;

  @Field(() => Int)
  reviewCount!: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
