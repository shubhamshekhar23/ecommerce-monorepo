import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductImageDto } from './product-image.dto';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Premium Laptop' })
  name!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  @ApiProperty({ example: 'premium-laptop' })
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiProperty({ example: 'High performance laptop', required: false })
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  @ApiProperty({ example: 999.99 })
  price!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(999999.99)
  @ApiProperty({ example: 500 })
  cost!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 50, required: false })
  stock?: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'cat_1' })
  categoryId!: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({
    type: [ProductImageDto],
    required: false,
  })
  images?: ProductImageDto[];
}
