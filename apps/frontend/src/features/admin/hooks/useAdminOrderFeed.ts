"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tokenStorage } from "@/shared/apiClient";
import { API_URL } from "@/shared/config";

interface OrderCreatedPayload {
  orderId: string;
  userId: string;
  orderNumber: string;
  totalPrice: number;
  itemCount: number;
  createdAt: string;
}

export function useAdminOrderFeed() {
  const qc = useQueryClient();

  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (!token) return;

    const socket = io(`${API_URL}/admin/orders`, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("order:created", (payload: OrderCreatedPayload) => {
      toast.success(
        `New order #${payload.orderNumber} — $${Number(payload.totalPrice).toFixed(2)}`,
      );
      qc.invalidateQueries({ queryKey: ["adminOrders"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);
}
