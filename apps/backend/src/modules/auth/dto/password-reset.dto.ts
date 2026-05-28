import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @IsEmail()
  @ApiProperty({ example: 'user@example.com' })
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Raw reset token from the email link' })
  token!: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'NewSecurePassword123' })
  newPassword!: string;
}
