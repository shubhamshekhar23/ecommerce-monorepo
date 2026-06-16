import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';
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

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: '+1-555-123-4567',
    required: false,
    description: 'Stored encrypted at rest',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  @ApiProperty({ example: '1990-05-15', required: false, description: 'Stored encrypted at rest' })
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'US-123456789',
    required: false,
    description: 'Stored encrypted at rest',
  })
  taxId?: string;
}
