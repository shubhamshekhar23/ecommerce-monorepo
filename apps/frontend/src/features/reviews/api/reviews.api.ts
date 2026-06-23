import apiClient from "@/shared/apiClient";
import type { Review, CreateReviewPayload } from "../interfaces";

export async function getProductReviewsApi(
  productId: string,
): Promise<Review[]> {
  const res = await apiClient.get<Review[]>(`/reviews/products/${productId}`);
  return res.data;
}

export async function createReviewApi(
  payload: CreateReviewPayload,
): Promise<Review> {
  const res = await apiClient.post<Review>("/reviews", payload);
  return res.data;
}

export async function approveReviewApi(reviewId: string): Promise<Review> {
  const res = await apiClient.patch<Review>(`/reviews/${reviewId}/approve`);
  return res.data;
}

export async function rejectReviewApi(reviewId: string): Promise<Review> {
  const res = await apiClient.patch<Review>(`/reviews/${reviewId}/reject`);
  return res.data;
}
