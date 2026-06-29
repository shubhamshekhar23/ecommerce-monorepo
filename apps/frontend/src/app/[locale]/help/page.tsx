import type { Metadata } from "next";
import { HelpCenter } from "@/features/support";

export const metadata: Metadata = {
  title: "Help Center — ShopHub",
  description:
    "Answers to common questions about orders, shipping, returns, and your account.",
};

export default function HelpPage() {
  return <HelpCenter />;
}
