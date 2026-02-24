// src/features/admin/api/admin-orders.api.ts

'use client';

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { Order, PaginatedOrders, OrderStatus } from '@/features/orders/interfaces';

export async function getAllOrdersApi(page = 1, limit = 20): Promise<PaginatedOrders> {
  try {
    const response = await apiClient.get<PaginatedOrders>('/orders', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to fetch orders');
  }
}

export async function updateOrderStatusApi(id: string, status: OrderStatus): Promise<Order> {
  try {
    const response = await apiClient.patch<Order>(`/orders/${id}/status`, { status });
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to update order status');
  }
}
