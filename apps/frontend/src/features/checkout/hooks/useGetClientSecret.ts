// src/features/checkout/hooks/useGetClientSecret.ts

'use client';

import { useMutation } from '@tanstack/react-query';
import { getClientSecretApi } from '../api/checkout.api';

export function useGetClientSecret() {
  return useMutation({
    mutationFn: (orderId: string) => getClientSecretApi(orderId),
  });
}
