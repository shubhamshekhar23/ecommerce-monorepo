import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({
    example: 'SecurePassword123',
    description: 'Min 8 chars with uppercase, lowercase, and number',
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John' })
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Doe' })
  lastName!: string;
}
