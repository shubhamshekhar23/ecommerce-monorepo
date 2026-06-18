// src/app/admin/orders/page.tsx

import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Orders | Admin",
  description: "Manage orders",
  robots: { index: false },
};

const AdminOrdersView = dynamic(
  () =>
    import("@/features/admin/components/AdminOrdersView/AdminOrdersView").then(
      (m) => m.AdminOrdersView,
    ),
  { ssr: false },
);

export default function OrdersAdminPage() {
  return <AdminOrdersView />;
}
