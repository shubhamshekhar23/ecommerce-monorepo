import apiClient from "@/shared/apiClient";

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
  score: number;
}

export async function getRecommendationsApi(
  productId: string,
): Promise<RecommendedProduct[]> {
  const res = await apiClient.get<RecommendedProduct[]>(
    `/recommendations/products/${productId}`,
  );
  return res.data;
}
