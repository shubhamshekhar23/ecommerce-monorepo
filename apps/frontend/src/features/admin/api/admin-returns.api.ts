import apiClient from "@/shared/apiClient";

export type ReturnStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";

export interface AdminReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: ReturnStatus;
  refundId?: string;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    orderItemId: string;
    quantity: number;
    reason?: string;
  }[];
}

export async function getAdminReturnsApi(): Promise<AdminReturnRequest[]> {
  // GET /returns is user-scoped; a dedicated GET /admin/returns endpoint
  // would be needed to list all users' returns. Using /returns for now.
  const res = await apiClient.get<AdminReturnRequest[]>("/returns");
  return res.data;
}

export async function approveReturnApi(
  id: string,
): Promise<AdminReturnRequest> {
  const res = await apiClient.patch<AdminReturnRequest>(
    `/returns/${id}/approve`,
  );
  return res.data;
}

export async function rejectReturnApi(
  id: string,
  reason: string,
): Promise<AdminReturnRequest> {
  const res = await apiClient.patch<AdminReturnRequest>(
    `/returns/${id}/reject`,
    { reason },
  );
  return res.data;
}

export async function refundReturnApi(id: string): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/returns/${id}/refund`);
  return res.data;
}
