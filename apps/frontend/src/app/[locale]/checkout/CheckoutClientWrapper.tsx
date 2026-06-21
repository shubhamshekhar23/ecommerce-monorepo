"use client";

import dynamic from "next/dynamic";

// CheckoutView loads @stripe/react-stripe-js — exclude it from the main bundle
// and skip SSR (Stripe Elements require the DOM). `ssr: false` is only valid
// inside a Client Component, so this wrapper lives in a separate file.
const CheckoutView = dynamic(
  () => import("@/features/checkout").then((m) => m.CheckoutView),
  { ssr: false },
);

export function CheckoutClientWrapper() {
  return <CheckoutView />;
}
