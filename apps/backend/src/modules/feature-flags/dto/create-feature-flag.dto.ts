import { IsString, IsBoolean, IsInt, IsOptional, Min, Max, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureFlagDto {
  @ApiProperty({ example: 'new-checkout-flow' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'name must be lowercase kebab-case' })
  name!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 100, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
