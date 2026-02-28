// src/app/admin/orders/page.tsx

import type { Metadata } from 'next';
import { AdminOrdersView } from '@/features/admin/components/AdminOrdersView/AdminOrdersView';

export const metadata: Metadata = {
  title: 'Orders | Admin',
  description: 'Manage orders',
};

export default function OrdersAdminPage() {
  return <AdminOrdersView />;
}
