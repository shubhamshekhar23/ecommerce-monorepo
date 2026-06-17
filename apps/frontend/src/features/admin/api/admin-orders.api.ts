// src/features/admin/api/admin-orders.api.ts

"use client";

import apiClient from "@/shared/apiClient";
import type {
  Order,
  PaginatedOrders,
  OrderStatus,
} from "@/features/orders/interfaces";

export async function getAllOrdersApi(
  page = 1,
  limit = 20,
): Promise<PaginatedOrders> {
  const response = await apiClient.get<PaginatedOrders>("/orders", {
    params: { page, limit },
  });
  return response.data;
}

export async function updateOrderStatusApi(
  id: string,
  status: OrderStatus,
): Promise<Order> {
  const response = await apiClient.patch<Order>(`/orders/${id}/status`, {
    status,
  });
  return response.data;
}
