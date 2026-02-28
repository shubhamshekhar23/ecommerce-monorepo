// src/features/cart/api/cart.api.ts

'use client';

import apiClient, { ApiRequestError } from '@/shared/apiClient';
import type { Cart, AddToCartPayload } from '../interfaces';

export async function getCartApi(): Promise<Cart | null> {
  try {
    const res = await apiClient.get<Cart | null>('/cart');
    return res.data;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(500, 'Failed to fetch cart');
  }
}

export async function addToCartApi(payload: AddToCartPayload): Promise<Cart> {
  try {
    const res = await apiClient.post<Cart>('/cart/items', payload);
    return res.data;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(500, 'Failed to add item to cart');
  }
}

export async function updateCartItemApi(itemId: string, quantity: number): Promise<Cart> {
  try {
    const res = await apiClient.patch<Cart>(`/cart/items/${itemId}`, { quantity });
    return res.data;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(500, 'Failed to update cart item');
  }
}

export async function removeCartItemApi(itemId: string): Promise<void> {
  try {
    await apiClient.delete(`/cart/items/${itemId}`);
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(500, 'Failed to remove cart item');
  }
}

export async function clearCartApi(): Promise<void> {
  try {
    await apiClient.delete('/cart');
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(500, 'Failed to clear cart');
  }
}
