// src/app/checkout/page.tsx

import type { Metadata } from 'next';
import { CheckoutView } from '@/features/checkout/components/CheckoutView/CheckoutView';

export const metadata: Metadata = {
  title: 'Checkout | ShopHub',
  description: 'Complete your purchase securely.',
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
