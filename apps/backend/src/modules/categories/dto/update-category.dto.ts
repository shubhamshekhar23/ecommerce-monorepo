import { IsOptional, IsString, IsUrl, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Electronics & Gadgets', required: false })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  @ApiProperty({ example: 'electronics-gadgets', required: false })
  slug?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Updated description', required: false })
  description?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ example: 'https://example.com/new-image.jpg', required: false })
  image?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'cat_456', required: false })
  parentId?: string;
}
