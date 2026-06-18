// src/app/admin/page.tsx

import type { Metadata } from "next";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard | ShopHub",
  description: "Manage your store",
  robots: { index: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
