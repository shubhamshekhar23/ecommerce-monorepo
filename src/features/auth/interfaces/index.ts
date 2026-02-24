// src/features/auth/interfaces/index.ts
// Auth feature type definitions

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'USER' | 'ADMIN' | 'VENDOR';
    isActive: boolean;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
}
