"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { validateCouponApi } from "../api/coupons.api";
import { handleMutationError } from "@/shared/mutationError";
import type { Coupon } from "../interfaces";

export function useCoupon() {
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const { mutate: apply, isPending } = useMutation({
    mutationFn: validateCouponApi,
    onSuccess: (coupon) => {
      setAppliedCoupon(coupon);
      toast.success(`Coupon "${coupon.code}" applied.`);
    },
    onError: (err) => handleMutationError(err, "Invalid or expired coupon."),
  });

  const remove = () => {
    setAppliedCoupon(null);
    toast.success("Coupon removed.");
  };

  const computeDiscount = (subtotal: number): number => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === "PERCENTAGE") {
      const discount = (subtotal * appliedCoupon.discountValue) / 100;
      return appliedCoupon.maxDiscountAmount
        ? Math.min(discount, appliedCoupon.maxDiscountAmount)
        : discount;
    }
    return Math.min(appliedCoupon.discountValue, subtotal);
  };

  return { appliedCoupon, apply, remove, isPending, computeDiscount };
}
