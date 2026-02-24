// src/features/auth/api/auth.api.ts
// Auth API functions

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { LoginPayload, RegisterPayload, AuthResponse } from '../interfaces';
import type { User } from '@/store/auth.store';

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Login failed');
  }
}

export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Registration failed');
  }
}

export async function logoutApi(refreshToken: string): Promise<void> {
  try {
    await apiClient.post('/auth/logout', { refreshToken });
  } catch (error) {
    // Log error but don't throw - logout should succeed locally even if API fails
    console.warn('Logout API error:', error);
  }
}

export async function getMeApi(): Promise<User> {
  try {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to fetch user profile');
  }
}
