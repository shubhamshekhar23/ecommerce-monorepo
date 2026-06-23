"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAddressesApi,
  createAddressApi,
  updateAddressApi,
  deleteAddressApi,
} from "../api/addresses.api";
import { handleMutationError } from "@/shared/mutationError";
import type { CreateAddressPayload, UpdateAddressPayload } from "../interfaces";

const KEY = ["addresses"];

export function useAddresses() {
  return useQuery({ queryKey: KEY, queryFn: getAddressesApi });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAddressPayload) => createAddressApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Address saved.");
    },
    onError: (err) => handleMutationError(err, "Failed to save address."),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateAddressPayload;
    }) => updateAddressApi(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Address updated.");
    },
    onError: (err) => handleMutationError(err, "Failed to update address."),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAddressApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Address removed.");
    },
    onError: (err) => handleMutationError(err, "Failed to remove address."),
  });
}
