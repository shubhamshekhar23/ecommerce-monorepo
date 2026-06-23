"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createVariantTypeApi,
  addVariantOptionApi,
  deleteVariantApi,
  updateVariantStockApi,
} from "../api/admin-products.api";
import { handleMutationError } from "@/shared/mutationError";

const productKey = (id: string) => ["adminProduct", id];

export function useCreateVariantType(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createVariantTypeApi(productId, { name }),
    onSuccess: () => {
      toast.success("Variant type added.");
      qc.invalidateQueries({ queryKey: productKey(productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to add variant type."),
  });
}

export function useAddVariantOption(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ typeId, value }: { typeId: string; value: string }) =>
      addVariantOptionApi(productId, typeId, { value }),
    onSuccess: () => {
      toast.success("Option added.");
      qc.invalidateQueries({ queryKey: productKey(productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to add option."),
  });
}

export function useDeleteVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) => deleteVariantApi(productId, variantId),
    onSuccess: () => {
      toast.success("Variant deleted.");
      qc.invalidateQueries({ queryKey: productKey(productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to delete variant."),
  });
}

export function useUpdateVariantStock(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, stock }: { variantId: string; stock: number }) =>
      updateVariantStockApi(productId, variantId, stock),
    onSuccess: () => {
      toast.success("Stock updated.");
      qc.invalidateQueries({ queryKey: productKey(productId) });
    },
    onError: (err) => handleMutationError(err, "Failed to update stock."),
  });
}
