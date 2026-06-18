// src/app/checkout/page.tsx

import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Checkout | ShopHub",
  description: "Complete your purchase securely.",
  robots: { index: false },
};

// CheckoutView loads @stripe/react-stripe-js — exclude it from the main bundle
// and skip SSR (Stripe Elements require the DOM).
const CheckoutView = dynamic(
  () => import("@/features/checkout").then((m) => m.CheckoutView),
  { ssr: false },
);

export default function CheckoutPage() {
  return <CheckoutView />;
}
