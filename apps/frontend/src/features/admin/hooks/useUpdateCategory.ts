// src/features/admin/hooks/useUpdateCategory.ts

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Category } from "@/features/products/interfaces";
import type { UpdateCategoryDto } from "../api/admin-categories.api";
import { updateCategoryApi } from "../api/admin-categories.api";
import { handleMutationError } from "@/shared/mutationError";

interface UpdateCategoryPayload {
  id: string;
  data: UpdateCategoryDto;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Category, Error, UpdateCategoryPayload>({
    mutationFn: (payload) => updateCategoryApi(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category saved");
    },
    onError: (err, vars) => {
      handleMutationError(err, "Failed to save category", () =>
        mutation.mutate(vars),
      );
    },
  });
  return mutation;
}
