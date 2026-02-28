// src/features/orders/api/orders.api.ts

'use client';

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { Order, PaginatedOrders } from '../interfaces';

export async function createOrderApi(): Promise<Order> {
  try {
    const response = await apiClient.post<Order>('/orders', {});
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to create order');
  }
}

export async function getUserOrdersApi(page = 1, limit = 20): Promise<PaginatedOrders> {
  try {
    const response = await apiClient.get<PaginatedOrders>('/orders/me', {
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

export async function getOrderApi(id: string): Promise<Order> {
  try {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to fetch order');
  }
}

export async function cancelOrderApi(id: string): Promise<Order> {
  try {
    const response = await apiClient.post<Order>(`/orders/${id}/cancel`, {});
    return response.data;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    throw new ApiRequestError(500, 'Failed to cancel order');
  }
}
