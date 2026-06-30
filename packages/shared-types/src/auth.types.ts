import type { User } from './user.types';

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
  user: User;
}

export interface TwoFactorPendingResponse {
  twoFactorRequired: true;
  twoFactorToken: string;
}

export type LoginResponse = AuthResponse | TwoFactorPendingResponse;
