import type { Metadata } from "next";
import { PrivacyPolicy } from "@/features/support";

export const metadata: Metadata = {
  title: "Privacy Policy — ShopHub",
  description: "How ShopHub collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
