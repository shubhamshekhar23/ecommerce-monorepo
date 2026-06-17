// src/features/orders/api/orders.api.ts

"use client";

import apiClient from "@/shared/apiClient";
import type { Order, PaginatedOrders } from "../interfaces";

// idempotencyKey: a UUID the caller generates once per checkout intent and
// reuses on retry. The backend returns the cached first response instead of
// creating a second order, preventing duplicate charges on network failures.
export async function createOrderApi(idempotencyKey: string): Promise<Order> {
  const response = await apiClient.post<Order>(
    "/orders",
    {},
    { headers: { "X-Idempotency-Key": idempotencyKey } },
  );
  return response.data;
}

export async function getUserOrdersApi(
  page = 1,
  limit = 20,
): Promise<PaginatedOrders> {
  const response = await apiClient.get<PaginatedOrders>("/orders/me", {
    params: { page, limit },
  });
  return response.data;
}

export async function getOrderApi(id: string): Promise<Order> {
  const response = await apiClient.get<Order>(`/orders/${id}`);
  return response.data;
}

export async function cancelOrderApi(id: string): Promise<Order> {
  const response = await apiClient.post<Order>(`/orders/${id}/cancel`, {});
  return response.data;
}
