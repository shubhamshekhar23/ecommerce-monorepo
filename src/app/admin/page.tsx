// src/app/admin/page.tsx

import type { Metadata } from 'next';
import { AdminDashboard } from './AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | ShopHub',
  description: 'Manage your store',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
