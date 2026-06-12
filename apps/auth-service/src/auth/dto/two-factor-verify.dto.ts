import { IsString, IsNotEmpty, Length } from 'class-validator';

export class TwoFactorVerifyDto {
  @IsString()
  @IsNotEmpty()
  twoFactorToken!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}

export class TwoFactorCodeDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}
