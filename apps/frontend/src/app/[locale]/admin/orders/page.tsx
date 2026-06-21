// src/app/admin/orders/page.tsx

import type { Metadata } from "next";
import { AdminOrdersClientWrapper } from "./AdminOrdersClientWrapper";

export const metadata: Metadata = {
  title: "Orders | Admin",
  description: "Manage orders",
  robots: { index: false },
};

export default function OrdersAdminPage() {
  return <AdminOrdersClientWrapper />;
}
