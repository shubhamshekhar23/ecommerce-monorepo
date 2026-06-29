import type { Metadata } from "next";
import { ContactPage } from "@/features/support";

export const metadata: Metadata = {
  title: "Contact Us — ShopHub",
  description: "Get in touch with the ShopHub support team.",
};

export default function ContactRoute() {
  return <ContactPage />;
}
