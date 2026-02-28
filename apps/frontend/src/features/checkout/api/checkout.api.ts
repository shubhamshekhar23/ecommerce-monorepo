// src/features/checkout/api/checkout.api.ts

'use client';

import apiClient, { ApiRequestError } from '@/shared/apiClient';

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  status: string;
  orderId: string;
}

export async function getClientSecretApi(orderId: string): Promise<PaymentIntentResponse> {
  try {
    const response = await apiClient.post<PaymentIntentResponse>(
      '/stripe/create-payment-intent',
      { orderId },
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to get payment intent');
  }
}
