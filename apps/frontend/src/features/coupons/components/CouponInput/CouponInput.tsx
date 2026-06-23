"use client";

import { useState } from "react";
import type { Coupon } from "../../interfaces";
import styles from "./CouponInput.module.scss";

interface CouponInputProps {
  onApply: (code: string) => void;
  onRemove: () => void;
  appliedCoupon: Coupon | null;
  isPending: boolean;
}

export function CouponInput({
  onApply,
  onRemove,
  appliedCoupon,
  isPending,
}: CouponInputProps) {
  const [code, setCode] = useState("");

  const handleApply = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    onApply(trimmed);
    setCode("");
  };

  if (appliedCoupon) {
    const isPercent = appliedCoupon.discountType === "PERCENTAGE";
    const label = isPercent
      ? `${appliedCoupon.discountValue}% off`
      : `$${appliedCoupon.discountValue} off`;

    return (
      <div className={styles.applied}>
        <div className={styles.appliedInfo}>
          <span className={styles.appliedCode}>{appliedCoupon.code}</span>
          <span className={styles.appliedLabel}>{label}</span>
        </div>
        <button
          onClick={onRemove}
          className={styles.removeBtn}
          aria-label="Remove coupon"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleApply()}
        placeholder="Coupon code"
        className={styles.input}
        disabled={isPending}
      />
      <button
        onClick={handleApply}
        disabled={isPending || !code.trim()}
        className={styles.applyBtn}
      >
        {isPending ? "Checking..." : "Apply"}
      </button>
    </div>
  );
}
