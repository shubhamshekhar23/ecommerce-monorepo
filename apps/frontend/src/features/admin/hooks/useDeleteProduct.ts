// src/features/admin/hooks/useDeleteProduct.ts

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteProductApi } from "../api/admin-products.api";
import { handleMutationError } from "@/shared/mutationError";

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id: string) => deleteProductApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: (err) => {
      handleMutationError(err, "Failed to delete product");
    },
  });
}
