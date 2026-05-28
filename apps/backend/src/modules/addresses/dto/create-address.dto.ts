import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @IsString() @IsNotEmpty() @ApiProperty() firstName!: string;
  @IsString() @IsNotEmpty() @ApiProperty() lastName!: string;
  @IsString() @IsNotEmpty() @ApiProperty() line1!: string;
  @IsString() @IsOptional() @ApiPropertyOptional() line2?: string;
  @IsString() @IsNotEmpty() @ApiProperty() city!: string;
  @IsString() @IsNotEmpty() @ApiProperty() state!: string;
  @IsString() @IsNotEmpty() @ApiProperty() country!: string;
  @IsString() @IsNotEmpty() @ApiProperty() postalCode!: string;
  @IsBoolean() @IsOptional() @ApiPropertyOptional() isDefault?: boolean;
}
