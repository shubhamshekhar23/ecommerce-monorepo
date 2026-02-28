// src/store/auth.store.ts
// Global auth state management with Zustand

import { create } from 'zustand';
import { tokenStorage } from '@/shared/apiClient';

// === TYPES ===

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN' | 'VENDOR';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setStatus: (status: AuthStatus) => void;
}

// === STORE ===

const AUTH_COOKIE_NAME = 'auth_session';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  accessToken: null,

  setAuth: (user: User, accessToken: string, refreshToken: string) => {
    tokenStorage.setTokens(accessToken, refreshToken);

    // Set session cookie for middleware detection (non-httpOnly, client-side only)
    if (typeof window !== 'undefined') {
      document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}`;
    }

    set({ user, status: 'authenticated', accessToken });
  },

  clearAuth: () => {
    tokenStorage.clearTokens();

    // Expire session cookie
    if (typeof window !== 'undefined') {
      document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    set({ user: null, status: 'unauthenticated', accessToken: null });
  },

  setStatus: (status: AuthStatus) => {
    set({ status });
  },
}));
