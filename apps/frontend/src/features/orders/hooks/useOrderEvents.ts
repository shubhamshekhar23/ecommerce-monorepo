"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/shared/apiClient";

export interface OrderEvent {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

async function getOrderEventsApi(orderId: string): Promise<OrderEvent[]> {
  const res = await apiClient.get<OrderEvent[]>(`/orders/${orderId}/events`);
  return res.data;
}

export function useOrderEvents(orderId: string) {
  return useQuery({
    queryKey: ["orderEvents", orderId],
    queryFn: () => getOrderEventsApi(orderId),
    enabled: !!orderId,
  });
}
