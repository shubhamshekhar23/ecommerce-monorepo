export interface OrderItemSnapshot {
  productName: string;
  quantity: number;
  price: number;
}

// Published when an order is confirmed and needs a confirmation email sent.
// This is a snapshot — all data the notification-service needs to send the
// email without hitting the database. Snapshots survive order status changes.
export interface OrderPlacedEvent {
  orderId: string;
  userId: string;
  userEmail: string;
  firstName: string;
  orderNumber: string;
  totalPrice: number;
  items: OrderItemSnapshot[];
  createdAt: string; // ISO string — Dates are not serialisable across the AMQP boundary
  correlationId?: string;
}

export interface OrderShippedEvent {
  orderId: string;
  userId: string;
  userEmail: string;
  firstName: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  correlationId?: string;
}

export interface OrderCancelledEvent {
  orderId: string;
  userId: string;
  userEmail: string;
  firstName: string;
  orderNumber: string;
  correlationId?: string;
}
