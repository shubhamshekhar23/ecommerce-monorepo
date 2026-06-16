import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmErasureDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({ description: 'Current password to confirm identity before scheduling erasure' })
  password!: string;
}
