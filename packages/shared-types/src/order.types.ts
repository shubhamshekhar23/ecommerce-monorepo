// Value object: an OrderItem has no identity outside its parent Order aggregate.
// Readonly enforces immutability — items are never mutated after the order is placed.
export type OrderItem = Readonly<{
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}>;

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

import type { PaginationMeta } from './common.types';

export interface PaginatedOrders {
  data: Order[];
  meta: PaginationMeta;
}
