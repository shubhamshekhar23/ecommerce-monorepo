export type UserRole = 'USER' | 'ADMIN' | 'VENDOR';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
