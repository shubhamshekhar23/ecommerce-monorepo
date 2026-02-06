import { ApiProperty } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty({
    description: 'Image ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Image URL',
    example: '/uploads/products/2024/01/abc123-product.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Alternative text for accessibility',
    example: 'Wireless Headphones Product Image',
    required: false,
  })
  altText?: string;
}

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Headphones',
  })
  name: string;

  @ApiProperty({
    description: 'URL-friendly product name',
    example: 'wireless-headphones',
  })
  slug: string;

  @ApiProperty({
    description: 'Detailed product description',
    example: 'Premium wireless headphones with noise cancellation',
  })
  description?: string;

  @ApiProperty({
    description: 'Current product price',
    example: 99.99,
  })
  price: number;

  @ApiProperty({
    description: 'Original price before discount',
    example: 149.99,
    required: false,
  })
  compareAtPrice?: number;

  @ApiProperty({
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
    required: false,
  })
  categoryName?: string;

  @ApiProperty({
    description: 'Stock keeping unit (SKU)',
    example: 'WH-BT-001',
  })
  sku: string;

  @ApiProperty({
    description: 'Current stock quantity',
    example: 150,
  })
  stock: number;

  @ApiProperty({
    description: 'Whether product is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Product images',
    type: [ProductImageResponseDto],
  })
  images: ProductImageResponseDto[];

  @ApiProperty({
    description: 'Product creation timestamp',
    example: '2024-01-10T08:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}
