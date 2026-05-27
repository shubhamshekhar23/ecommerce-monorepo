import { IsNotEmpty, IsString, IsArray, ArrayMinSize, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantTypeDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Size', description: 'Variant type name, e.g. "Size" or "Color"' })
  name!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @ApiProperty({ example: ['S', 'M', 'L', 'XL'], description: 'Initial options to create', required: false })
  options?: string[];
}
