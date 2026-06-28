import type { Metadata } from "next";
import { AddressesPage } from "@/features/account";

export const metadata: Metadata = {
  title: "Addresses | ShopHub",
  robots: { index: false },
};

export default function Page() {
  return <AddressesPage />;
}
