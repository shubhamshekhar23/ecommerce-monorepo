import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { User } from '@ecommerce/shared-types';

/*
 - implements User — TypeScript enforces that this DTO's shape matches the
 - shared interface. A mismatch causes a compile error here, surfacing
 - backend drift before it reaches the frontend contract.
 */
export class UserResponseDto implements User {
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
  totpEnabled!: boolean;

  /*
   - JSON serialisation produces ISO-8601 strings; the shared User type
   - uses string for timestamps to reflect the wire format.
   */
  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ required: false, nullable: true })
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true })
  dateOfBirth?: string | null;

  @ApiProperty({ required: false, nullable: true })
  taxId?: string | null;
}
