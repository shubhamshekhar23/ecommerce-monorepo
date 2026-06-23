import apiClient from "@/shared/apiClient";
import type { ReturnRequest, CreateReturnPayload } from "../interfaces";

export async function createReturnApi(
  payload: CreateReturnPayload,
): Promise<ReturnRequest> {
  const res = await apiClient.post<ReturnRequest>("/returns", payload);
  return res.data;
}

export async function getUserReturnsApi(): Promise<ReturnRequest[]> {
  const res = await apiClient.get<ReturnRequest[]>("/returns");
  return res.data;
}
