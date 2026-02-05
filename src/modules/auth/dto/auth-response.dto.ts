import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@/modules/users/dto';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token with 15-minute expiry',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token with 7-day expiry',
  })
  refreshToken!: string;

  @ApiProperty({
    type: UserResponseDto,
    description: 'Authenticated user details',
  })
  user!: UserResponseDto;
}
