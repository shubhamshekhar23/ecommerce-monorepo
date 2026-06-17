import { IsString, IsOptional, IsBoolean, IsInt, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionRuleDto {
  @ApiProperty({ example: 'GOLD member over $100' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'JSON condition object',
    example: '{"minOrderValue":100,"customerTier":"GOLD"}',
  })
  @IsObject()
  condition!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'DSL string — compiled to condition on save',
    example: 'IF order.subtotal > 100 AND customer.tier == "GOLD" THEN discount(percentage: 15)',
  })
  @IsString()
  @IsOptional()
  conditionDsl?: string;

  @ApiProperty({
    description: 'JSON action object',
    example: '{"type":"percentage_discount","value":15}',
  })
  @IsObject()
  action!: Record<string, unknown>;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  stackable?: boolean;
}
