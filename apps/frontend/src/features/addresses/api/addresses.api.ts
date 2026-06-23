import apiClient from "@/shared/apiClient";
import type {
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,
} from "../interfaces";

export async function getAddressesApi(): Promise<Address[]> {
  const response = await apiClient.get<Address[]>("/addresses");
  return response.data;
}

export async function createAddressApi(
  payload: CreateAddressPayload,
): Promise<Address> {
  const response = await apiClient.post<Address>("/addresses", payload);
  return response.data;
}

export async function updateAddressApi(
  id: string,
  payload: UpdateAddressPayload,
): Promise<Address> {
  const response = await apiClient.patch<Address>(`/addresses/${id}`, payload);
  return response.data;
}

export async function deleteAddressApi(id: string): Promise<void> {
  await apiClient.delete(`/addresses/${id}`);
}
