// src/features/admin/hooks/useAdminUsers.ts

'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllUsersApi } from '../api/admin-users.api';

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAllUsersApi,
  });
}
