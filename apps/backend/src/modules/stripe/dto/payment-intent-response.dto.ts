import { ApiProperty } from '@nestjs/swagger';

export class PaymentIntentResponseDto {
  @ApiProperty({
    example: 'pi_1234567890',
    description: 'Stripe payment intent ID',
  })
  paymentIntentId!: string;

  @ApiProperty({
    example: 'seti_1234567890_secret_key',
    description: 'Client secret for completing payment on frontend',
  })
  clientSecret!: string;

  @ApiProperty({
    example: 9999,
    description: 'Amount in cents',
  })
  amount!: number;

  @ApiProperty({
    example: 'succeeded',
    description: 'Payment intent status',
  })
  status!: string;

  @ApiProperty({
    example: 'order_123abc',
    description: 'Associated order ID',
  })
  orderId!: string;
}
