import { Injectable, Scope } from '@nestjs/common';
import { Resolver, Query, Args, ID, ResolveField, Parent, Extensions } from '@nestjs/graphql';
import { Public } from '@/common/decorators';
import { ReviewsLoader } from '@/modules/reviews/reviews.loader';
import { ReviewType } from '@/modules/reviews/types/review.type';
import { ProductsService } from './products.service';
import { ProductType } from './types/product.type';

@Injectable({ scope: Scope.REQUEST })
@Resolver(() => ProductType)
export class ProductsResolver {
  constructor(
    private readonly productsService: ProductsService,
    private readonly reviewsLoader: ReviewsLoader,
  ) {}

  @Query(() => [ProductType], { name: 'products' })
  @Public()
  async findAll(
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 20 }) limit: number,
    @Args('search', { nullable: true }) search?: string,
    @Args('sort', { nullable: true }) sort?: string,
  ): Promise<ProductType[]> {
    const result = await this.productsService.findAll(page, limit, search, sort);
    return result.data as unknown as ProductType[];
  }

  @Query(() => ProductType, { name: 'product' })
  @Public()
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<ProductType> {
    return this.productsService.findById(id) as unknown as Promise<ProductType>;
  }

  @ResolveField(() => [ReviewType], { name: 'reviews' })
  @Extensions({ complexity: 10 })
  @Public()
  async reviews(@Parent() product: ProductType): Promise<ReviewType[]> {
    return this.reviewsLoader.load(product.id) as unknown as Promise<ReviewType[]>;
  }
}
