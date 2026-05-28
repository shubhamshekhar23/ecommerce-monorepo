import { IsString, IsNotEmpty, IsArray, IsInt, Min, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ReturnItemDto {
  @IsString() @IsNotEmpty() @ApiProperty() orderItemId!: string;
  @IsInt() @Min(1) @ApiProperty() quantity!: number;
  @IsString() @IsOptional() @ApiPropertyOptional() reason?: string;
}

export class CreateReturnDto {
  @IsString() @IsNotEmpty() @ApiProperty() orderId!: string;
  @IsString() @IsNotEmpty() @ApiProperty() reason!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReturnItemDto) @ApiProperty({ type: [ReturnItemDto] }) items!: ReturnItemDto[];
}
