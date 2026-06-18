import type { Order, PaginatedOrders } from "../interfaces";

export const mockOrder: Order = {
  id: "order-1",
  orderNumber: "ORD-001",
  userId: "user-1",
  items: [
    {
      id: "oi-1",
      productId: "prod-1",
      productName: "Wireless Headphones",
      quantity: 2,
      price: 199.99,
      subtotal: 399.98,
    },
  ],
  totalPrice: 399.98,
  status: "CONFIRMED",
  paymentStatus: "SUCCEEDED",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockPaginatedOrders: PaginatedOrders = {
  data: [mockOrder],
  meta: { total: 1, page: 1, limit: 20, pages: 1, hasMore: false },
};
