"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getProductReviewsApi,
  createReviewApi,
  approveReviewApi,
  rejectReviewApi,
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
    mutationFn: (payload: Omit<CreateReviewPayload, "productId">) =>
      createReviewApi({ ...payload, productId }),
    onSuccess: () => {
      toast.success("Review submitted. It will appear after moderation.");
      qc.invalidateQueries({ queryKey: reviewsKey(productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to submit review."),
  });
}

export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveReviewApi,
    onSuccess: (review) => {
      toast.success("Review approved.");
      qc.invalidateQueries({ queryKey: reviewsKey(review.productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to approve review."),
  });
}

export function useRejectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectReviewApi,
    onSuccess: (review) => {
      toast.success("Review rejected.");
      qc.invalidateQueries({ queryKey: reviewsKey(review.productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to reject review."),
  });
}
