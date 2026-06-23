import apiClient from "@/shared/apiClient";
import type { Coupon } from "../interfaces";

export async function validateCouponApi(code: string): Promise<Coupon> {
  const res = await apiClient.get<Coupon>(
    `/coupons/${encodeURIComponent(code)}/validate`,
  );
  return res.data;
}
