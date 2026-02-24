// src/features/admin/api/admin-users.api.ts

'use client';

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { User } from '@/store/auth.store';

export async function getAllUsersApi(): Promise<User[]> {
  try {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to fetch users');
  }
}
