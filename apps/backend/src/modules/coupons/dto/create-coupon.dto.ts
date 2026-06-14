import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '@prisma/client';

export class CreateCouponDto {
  @IsString() @IsNotEmpty() @ApiProperty({ example: 'SAVE10' }) code!: string;
  @IsEnum(CouponType) @ApiProperty({ enum: CouponType }) type!: CouponType;
  @IsNumber() @Min(0) @ApiProperty({ example: 10 }) value!: number;
  @IsNumber() @IsOptional() @ApiPropertyOptional() minOrderAmount?: number;
  @IsNumber() @IsOptional() @ApiPropertyOptional() maxUses?: number;
  @IsDateString() @IsOptional() @ApiPropertyOptional() expiresAt?: string;
  @IsBoolean() @IsOptional() @ApiPropertyOptional() isActive?: boolean;
}
