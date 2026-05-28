import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorVerifyDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Short-lived token returned by login when 2FA is enabled' })
  twoFactorToken!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @ApiProperty({ description: '6-digit TOTP code from authenticator app', example: '123456' })
  code!: string;
}

export class TwoFactorCodeDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @ApiProperty({ description: '6-digit TOTP code from authenticator app', example: '123456' })
  code!: string;
}
