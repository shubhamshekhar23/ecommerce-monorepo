import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'order_123abc',
    description: 'The ID of the order to create a payment intent for',
  })
  orderId!: string;
}
