import { IsNotEmpty, IsString, IsOptional, IsUrl, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Electronics' })
  name!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  @ApiProperty({ example: 'electronics' })
  slug!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Electronic devices and gadgets', required: false })
  description?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ example: 'https://example.com/electronics.jpg', required: false })
  image?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'cat_123', required: false })
  parentId?: string;
}
