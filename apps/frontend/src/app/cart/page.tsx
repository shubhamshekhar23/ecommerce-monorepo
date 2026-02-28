// src/app/cart/page.tsx

import type { Metadata } from 'next';
import { CartView } from '@/features/cart/components/CartView/CartView';

export const metadata: Metadata = {
  title: 'Shopping Cart | ShopHub',
  description: 'Review your cart and proceed to checkout.',
};

export default function CartPage() {
  return <CartView />;
}
