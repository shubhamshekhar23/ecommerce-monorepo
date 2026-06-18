// src/app/cart/page.tsx

import type { Metadata } from "next";
import { CartView } from "@/features/cart";

export const metadata: Metadata = {
  title: "Shopping Cart | ShopHub",
  description: "Review your cart and proceed to checkout.",
  robots: { index: false },
};

export default function CartPage() {
  return <CartView />;
}
