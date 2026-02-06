import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({
    description: 'Cart item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Product ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Headphones',
  })
  productName: string;

  @ApiProperty({
    description: 'Quantity of items',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit price',
    example: 99.99,
  })
  price: number;

  @ApiProperty({
    description: 'Subtotal (price × quantity)',
    example: 199.98,
  })
  subtotal: number;
}

export class CartResponseDto {
  @ApiProperty({
    description: 'Cart ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Items in cart',
    type: [CartItemResponseDto],
  })
  items: CartItemResponseDto[];

  @ApiProperty({
    description: 'Total price of all items',
    example: 299.97,
  })
  totalPrice: number;

  @ApiProperty({
    description: 'Number of items in cart',
    example: 3,
  })
  itemCount: number;

  @ApiProperty({
    description: 'Cart creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T11:45:00Z',
  })
  updatedAt: Date;
}
