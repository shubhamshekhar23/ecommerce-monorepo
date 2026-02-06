import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({
    description: 'Order item ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id?: string;

  @ApiProperty({
    description: 'Product ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  productId?: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Mouse',
  })
  productName?: string;

  @ApiProperty({
    description: 'Quantity ordered',
    example: 1,
  })
  quantity?: number;

  @ApiProperty({
    description: 'Unit price at time of order',
    example: 49.99,
  })
  price?: number;

  @ApiProperty({
    description: 'Item subtotal',
    example: 49.99,
  })
  subtotal?: number;
}

export class OrderResponseDto {
  @ApiProperty({
    description: 'Order ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id?: string;

  @ApiProperty({
    description: 'Unique order number',
    example: 'ORD-20240115-ABC123',
  })
  orderNumber?: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId?: string;

  @ApiProperty({
    description: 'Order items',
    type: [OrderItemResponseDto],
  })
  items?: OrderItemResponseDto[];

  @ApiProperty({
    description: 'Total order amount',
    example: 299.97,
  })
  totalPrice?: number;

  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status?: OrderStatus;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  paymentStatus?: PaymentStatus;

  @ApiProperty({
    description: 'Stripe payment intent ID',
    example: 'pi_1234567890abcdef',
    required: false,
  })
  paymentIntentId?: string;

  @ApiProperty({
    description: 'Payment completion timestamp',
    example: '2024-01-15T10:35:00Z',
    required: false,
  })
  paidAt?: Date;

  @ApiProperty({
    description: 'Order creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:35:00Z',
  })
  updatedAt?: Date;
}
