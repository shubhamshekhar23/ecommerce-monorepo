"use client";

import { useState } from "react";
import { FlagGuard } from "@/shared/featureFlags";
import styles from "./WishlistButton.module.scss";

interface Props {
  productId: string;
}

function WishlistButtonInner({ productId: _ }: Props) {
  const [saved, setSaved] = useState(false);

  return (
    <button
      className={`${styles.btn} ${saved ? styles.saved : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved((v) => !v);
      }}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      title={saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill={saved ? "currentColor" : "none"}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 0 1 8 3.6 3.5 3.5 0 0 1 14 5.5C14 9.5 8 13.5 8 13.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function WishlistButton(props: Props) {
  return (
    <FlagGuard flag="wishlist" fallback={null}>
      <WishlistButtonInner {...props} />
    </FlagGuard>
  );
}
