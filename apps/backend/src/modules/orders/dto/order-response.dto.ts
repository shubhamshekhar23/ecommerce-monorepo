import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id!: string;

  @ApiProperty({ example: 'clprod456' })
  productId!: string;

  @ApiProperty({ example: 'Slim Fit Shirt', nullable: true })
  productName!: string | null;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price at time of order', example: 74.99 })
  price!: number;

  @ApiProperty({ example: 'Electronics', nullable: true })
  categoryName!: string | null;

  @ApiProperty({
    description: 'Variant attributes snapshot at order time',
    example: { Size: 'M', Color: 'White' },
    nullable: true,
  })
  variantAttributes!: Record<string, string> | null;

  @ApiProperty({ example: 149.98 })
  subtotal!: number;
}

export class OrderResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id!: string;

  @ApiProperty({ example: 'ORD-00042' })
  orderNumber!: string;

  @ApiProperty({ example: 'cluser456' })
  userId!: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ example: '5.00', nullable: true })
  shippingCost!: string | null;

  @ApiProperty({ example: 154.99 })
  totalPrice!: number;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  status!: OrderStatus;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;

  @ApiProperty({ example: 'Please leave at the door', nullable: true })
  notes!: string | null;

  @ApiProperty({ example: '2026-06-06T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-06T10:05:00.000Z' })
  updatedAt!: Date;
}
