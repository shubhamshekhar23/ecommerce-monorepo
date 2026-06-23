import apiClient from "@/shared/apiClient";
import type { Review, CreateReviewPayload } from "../interfaces";

export async function getProductReviewsApi(
  productId: string,
): Promise<Review[]> {
  const res = await apiClient.get<Review[]>(`/products/${productId}/reviews`);
  return res.data;
}

export async function createReviewApi(
  productId: string,
  payload: CreateReviewPayload,
): Promise<Review> {
  const res = await apiClient.post<Review>(
    `/products/${productId}/reviews`,
    payload,
  );
  return res.data;
}

export async function updateReviewApi(
  productId: string,
  reviewId: string,
  payload: Partial<CreateReviewPayload>,
): Promise<Review> {
  const res = await apiClient.patch<Review>(
    `/products/${productId}/reviews/${reviewId}`,
    payload,
  );
  return res.data;
}

export async function deleteReviewApi(
  productId: string,
  reviewId: string,
): Promise<void> {
  await apiClient.delete(`/products/${productId}/reviews/${reviewId}`);
}
