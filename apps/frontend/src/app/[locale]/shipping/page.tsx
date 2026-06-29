import type { Metadata } from "next";
import { ShippingInfo } from "@/features/support";

export const metadata: Metadata = {
  title: "Shipping Info — ShopHub",
  description: "Delivery options, timelines, and our free shipping threshold.",
};

export default function ShippingPage() {
  return <ShippingInfo />;
}
