import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  @ApiProperty({ example: 'newemail@example.com', required: false })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Jane', required: false })
  firstName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Smith', required: false })
  lastName?: string;
}
