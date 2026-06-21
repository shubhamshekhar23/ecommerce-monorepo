// src/app/checkout/page.tsx

import type { Metadata } from "next";
import { CheckoutClientWrapper } from "./CheckoutClientWrapper";

export const metadata: Metadata = {
  title: "Checkout | ShopHub",
  description: "Complete your purchase securely.",
  robots: { index: false },
};

export default function CheckoutPage() {
  return <CheckoutClientWrapper />;
}
