import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductImageDto } from './product-image.dto';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Premium Laptop', required: false })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  @ApiProperty({ example: 'premium-laptop', required: false })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiProperty({ example: 'High performance laptop', required: false })
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  @ApiProperty({ example: 999.99, required: false })
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999.99)
  @ApiProperty({ example: 500, required: false })
  cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 50, required: false })
  stock?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'cat_1', required: false })
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({
    type: [ProductImageDto],
    required: false,
  })
  images?: ProductImageDto[];
}
