import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @IsString() @IsNotEmpty() @ApiProperty() productId!: string;
  @IsInt() @Min(1) @Max(5) @ApiProperty({ minimum: 1, maximum: 5 }) rating!: number;
  @IsString() @IsOptional() @ApiPropertyOptional() title?: string;
  @IsString() @IsOptional() @ApiPropertyOptional() body?: string;
}
