"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/shared/apiClient";
import { handleMutationError } from "@/shared/mutationError";

interface InvoiceResponse {
  url: string;
  status: "PENDING" | "READY";
}

async function requestInvoiceApi(orderId: string): Promise<void> {
  await apiClient.post(`/orders/${orderId}/invoice`);
}

async function getInvoiceApi(orderId: string): Promise<InvoiceResponse> {
  const res = await apiClient.get<InvoiceResponse>(
    `/orders/${orderId}/invoice`,
  );
  return res.data;
}

export function useInvoice(orderId: string) {
  const [polling, setPolling] = useState(false);
  const openedRef = useRef(false);
  const qc = useQueryClient();

  const { mutate: request, isPending: isRequesting } = useMutation({
    mutationFn: () => requestInvoiceApi(orderId),
    onSuccess: () => {
      openedRef.current = false;
      setPolling(true);
    },
    onError: (err) => handleMutationError(err, "Failed to generate invoice."),
  });

  const { data: invoice } = useQuery({
    queryKey: ["invoice", orderId],
    queryFn: () => getInvoiceApi(orderId),
    enabled: polling,
    refetchInterval: (query) => {
      if (query.state.data?.status === "READY") return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (invoice?.status === "READY" && invoice.url && !openedRef.current) {
      openedRef.current = true;
      toast.success("Invoice ready.");
      window.open(invoice.url, "_blank", "noopener,noreferrer");
      qc.removeQueries({ queryKey: ["invoice", orderId] });
      // Schedule turning off polling after the current render cycle
      const id = setTimeout(() => setPolling(false), 0);
      return () => clearTimeout(id);
    }
  }, [invoice, orderId, qc]);

  return { request, isRequesting, isPolling: polling };
}
