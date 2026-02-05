import { IsString, IsOptional, IsBoolean, IsInt, IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductImageDto {
  @IsUrl()
  @IsNotEmpty()
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  url!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Product image', required: false })
  altText?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  isMain?: boolean;

  @IsOptional()
  @IsInt()
  @ApiProperty({ example: 0, required: false })
  order?: number;
}
