import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  dateOfBirth?: string | null;

  @ApiProperty({ required: false, nullable: true })
  taxId?: string | null;
}
