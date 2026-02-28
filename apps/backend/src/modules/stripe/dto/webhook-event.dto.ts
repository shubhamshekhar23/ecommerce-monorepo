import { ApiProperty } from '@nestjs/swagger';

export class WebhookEventDto {
  @ApiProperty({
    example: 'payment_intent.succeeded',
    description: 'Type of webhook event',
  })
  type!: string;

  @ApiProperty({
    description: 'Event data object',
  })
  data!: Record<string, any>;

  @ApiProperty({
    example: 'evt_1234567890',
    description: 'Unique event ID',
  })
  id!: string;
}
