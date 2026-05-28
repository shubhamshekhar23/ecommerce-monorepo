export type NotificationJobType = 'order-confirmation' | 'order-cancelled';

export interface OrderItemSnapshot {
  productName: string;
  quantity: number;
  price: number;
}

// Snapshot of all data the worker needs — avoids a second DB round-trip inside
// the worker, and survives if the order is later mutated or soft-deleted.
// correlationId: threads the X-Request-ID from the HTTP request into the
// background job so every log line (HTTP + worker) shares one ID.
export interface NotificationJobPayload {
  type: NotificationJobType;
  orderId: string;
  userId: string;
  userEmail: string;
  firstName: string;
  orderNumber: string;
  totalPrice: number;
  items: OrderItemSnapshot[];
  // ISO string; Dates are not serialisable across the Redis queue boundary
  createdAt: string;
  correlationId?: string;
}
