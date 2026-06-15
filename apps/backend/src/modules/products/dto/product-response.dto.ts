import { ApiProperty } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty({ example: 'climg123' })
  id!: string;

  @ApiProperty({ example: 'https://picsum.photos/seed/abc/800/600' })
  url!: string;

  @ApiProperty({ example: 'Wireless Headphones - image 1', nullable: true })
  altText!: string | null;

  @ApiProperty({ example: true })
  isMain!: boolean;

  @ApiProperty({ example: 0 })
  order!: number;
}

export class ProductPriceRangeDto {
  @ApiProperty({ example: 74.99, nullable: true })
  min!: number | null;

  @ApiProperty({ example: 149.99, nullable: true })
  max!: number | null;
}

export class ProductVariantSummaryDto {
  @ApiProperty({ example: '74.99' })
  price!: string;
}

export class ProductResponseDto {
  @ApiProperty({ example: 'clprod456' })
  id!: string;

  @ApiProperty({ example: 'Wireless Headphones' })
  name!: string;

  @ApiProperty({ example: 'wireless-headphones' })
  slug!: string;

  @ApiProperty({ example: 'Premium wireless headphones with noise cancellation', nullable: true })
  description!: string | null;

  @ApiProperty({ type: () => ProductPriceRangeDto })
  priceRange!: ProductPriceRangeDto;

  @ApiProperty({ example: 'clcat789' })
  categoryId!: string;

  @ApiProperty({ example: 'Electronics', nullable: true })
  categoryName!: string | null;

  @ApiProperty({ type: [ProductImageResponseDto] })
  images!: ProductImageResponseDto[];

  @ApiProperty({ type: [ProductVariantSummaryDto] })
  variants!: ProductVariantSummaryDto[];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 4.5, nullable: true })
  avgRating!: number | null;

  @ApiProperty({ example: 23 })
  reviewCount!: number;

  @ApiProperty({ example: '2026-06-06T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-06T10:05:00.000Z' })
  updatedAt!: Date;
}

// FTS path returns a leaner shape — no images/variants array, adds searchRank
export class ProductSearchResponseDto {
  @ApiProperty({ example: 'clprod456' })
  id!: string;

  @ApiProperty({ example: 'Wireless Headphones' })
  name!: string;

  @ApiProperty({ example: 'wireless-headphones' })
  slug!: string;

  @ApiProperty({ example: 'Premium wireless headphones', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'clcat789' })
  categoryId!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: () => ProductPriceRangeDto })
  priceRange!: ProductPriceRangeDto;

  @ApiProperty({ example: 0.9876, description: 'ts_rank score from PostgreSQL FTS' })
  searchRank!: number;

  @ApiProperty({ example: 4.5, nullable: true })
  avgRating!: number | null;

  @ApiProperty({ example: 23 })
  reviewCount!: number;

  @ApiProperty({ example: '2026-06-06T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-06T10:05:00.000Z' })
  updatedAt!: Date;
}
