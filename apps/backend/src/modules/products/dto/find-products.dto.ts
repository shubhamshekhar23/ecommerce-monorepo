import { IsOptional, IsNumber, IsUUID, IsBoolean, Min, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ description: 'Minimum product price filter (inclusive)', example: 10 })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ description: 'Maximum product price filter (inclusive)', example: 500 })
  maxPrice?: number;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Only return products with stock > 0', example: true })
  inStock?: boolean;

  @IsOptional()
  @Matches(/^(name|createdAt|avgRating)(:(asc|desc))?(,(name|createdAt|avgRating)(:(asc|desc))?)*$/)
  @ApiPropertyOptional({
    description: 'Sort fields (comma-separated): name:asc,avgRating:desc',
    example: 'avgRating:desc',
  })
  sort?: string;
}
