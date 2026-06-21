// src/features/admin/hooks/useCreateCategory.ts

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Category } from "@/features/products/interfaces";
import type { CreateCategoryDto } from "../api/admin-categories.api";
import { createCategoryApi } from "../api/admin-categories.api";
import { handleMutationError } from "@/shared/mutationError";

export function useCreateCategory() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Category, Error, CreateCategoryDto>({
    mutationFn: (payload) => createCategoryApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
    },
    onError: (err, vars) => {
      handleMutationError(err, "Failed to create category", () =>
        mutation.mutate(vars),
      );
    },
  });
  return mutation;
}
