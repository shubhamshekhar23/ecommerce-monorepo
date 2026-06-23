import apiClient from "@/shared/apiClient";

export async function subscribeStockAlertApi(
  productId: string,
  variantId?: string,
): Promise<void> {
  await apiClient.post(`/products/${productId}/stock-alerts`, { variantId });
}

export async function unsubscribeStockAlertApi(
  productId: string,
  variantId?: string,
): Promise<void> {
  await apiClient.delete(`/products/${productId}/stock-alerts`, {
    data: { variantId },
  });
}
