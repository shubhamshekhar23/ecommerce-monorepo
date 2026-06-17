// src/features/checkout/api/checkout.api.ts

"use client";

import apiClient from "@/shared/apiClient";

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  status: string;
  orderId: string;
}

export async function getClientSecretApi(
  orderId: string,
): Promise<PaymentIntentResponse> {
  const response = await apiClient.post<PaymentIntentResponse>(
    "/stripe/create-payment-intent",
    { orderId },
  );
  return response.data;
}
