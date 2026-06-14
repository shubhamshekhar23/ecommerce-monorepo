import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
  ArrayMinSize,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class VariantAttributeDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Size', description: 'Variant type name' })
  typeName!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'L', description: 'Option value' })
  optionValue!: string;
}

export class CreateVariantDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'LAPTOP-PRO-L-RED', description: 'Unique SKU for this variant' })
  sku!: string;

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

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ApiProperty({
    type: [VariantAttributeDto],
    required: false,
    description: 'Attribute values, e.g. [{typeName:"Size",optionValue:"L"}]',
  })
  attributes?: VariantAttributeDto[];

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  isActive?: boolean;
}

export class UpdateVariantStockDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 100 })
  stock!: number;
}
