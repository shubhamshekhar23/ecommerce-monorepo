// src/app/orders/[id]/page.tsx

import type { Metadata } from 'next';
import { OrderDetailView } from '@/features/orders/components/OrderDetailView/OrderDetailView';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Order Details | ShopHub',
  description: 'View your order details.',
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return <OrderDetailView id={id} />;
}
