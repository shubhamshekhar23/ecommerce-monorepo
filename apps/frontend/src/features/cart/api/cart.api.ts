// src/features/cart/api/cart.api.ts

"use client";

import apiClient from "@/shared/apiClient";
import type { Cart, AddToCartPayload } from "../interfaces";

export async function getCartApi(): Promise<Cart | null> {
  const res = await apiClient.get<Cart | null>("/cart");
  return res.data;
}

export async function addToCartApi(payload: AddToCartPayload): Promise<Cart> {
  const res = await apiClient.post<Cart>("/cart/items", payload);
  return res.data;
}

export async function updateCartItemApi(
  itemId: string,
  quantity: number,
): Promise<Cart> {
  const res = await apiClient.patch<Cart>(`/cart/items/${itemId}`, {
    quantity,
  });
  return res.data;
}

export async function removeCartItemApi(itemId: string): Promise<void> {
  await apiClient.delete(`/cart/items/${itemId}`);
}

export async function clearCartApi(): Promise<void> {
  await apiClient.delete("/cart");
}
