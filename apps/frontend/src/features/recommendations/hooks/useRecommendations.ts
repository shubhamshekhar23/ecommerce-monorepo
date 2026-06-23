"use client";

import { useQuery } from "@tanstack/react-query";
import { getRecommendationsApi } from "../api/recommendations.api";

export function useRecommendations(productId: string) {
  return useQuery({
    queryKey: ["recommendations", productId],
    queryFn: () => getRecommendationsApi(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}
