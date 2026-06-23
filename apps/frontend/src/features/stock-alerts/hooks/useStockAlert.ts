"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  subscribeStockAlertApi,
  unsubscribeStockAlertApi,
} from "../api/stockAlerts.api";
import { handleMutationError } from "@/shared/mutationError";

export function useSubscribeStockAlert(productId: string, variantId?: string) {
  return useMutation({
    mutationFn: () => subscribeStockAlertApi(productId, variantId),
    onSuccess: () =>
      toast.success("We'll notify you when this item is back in stock."),
    onError: (err) => handleMutationError(err, "Failed to set up alert."),
  });
}

export function useUnsubscribeStockAlert(
  productId: string,
  variantId?: string,
) {
  return useMutation({
    mutationFn: () => unsubscribeStockAlertApi(productId, variantId),
    onSuccess: () => toast.success("Stock alert removed."),
    onError: (err) => handleMutationError(err, "Failed to remove alert."),
  });
}
