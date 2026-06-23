"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getProductReviewsApi,
  createReviewApi,
  updateReviewApi,
  deleteReviewApi,
} from "../api/reviews.api";
import { handleMutationError } from "@/shared/mutationError";
import type { CreateReviewPayload } from "../interfaces";

const reviewsKey = (productId: string) => ["reviews", productId];

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: reviewsKey(productId),
    queryFn: () => getProductReviewsApi(productId),
    enabled: !!productId,
  });
}

export function useCreateReview(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReviewPayload) =>
      createReviewApi(productId, payload),
    onSuccess: () => {
      toast.success("Review submitted.");
      qc.invalidateQueries({ queryKey: reviewsKey(productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to submit review."),
  });
}

export function useUpdateReview(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: Partial<CreateReviewPayload>;
    }) => updateReviewApi(productId, reviewId, payload),
    onSuccess: () => {
      toast.success("Review updated.");
      qc.invalidateQueries({ queryKey: reviewsKey(productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to update review."),
  });
}

export function useDeleteReview(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => deleteReviewApi(productId, reviewId),
    onSuccess: () => {
      toast.success("Review deleted.");
      qc.invalidateQueries({ queryKey: reviewsKey(productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to delete review."),
  });
}
