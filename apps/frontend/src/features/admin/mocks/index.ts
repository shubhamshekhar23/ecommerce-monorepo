import type { PaginatedProducts } from "../../products/interfaces";
import type { PaginatedOrders } from "../../orders/interfaces";

export const mockAdminProducts: PaginatedProducts = {
  data: [
    {
      id: "prod-1",
      name: "Wireless Headphones",
      slug: "wireless-headphones",
      price: 199.99,
      cost: 80,
      stock: 50,
      categoryId: "cat-1",
      images: [],
      variants: [],
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
  ],
  meta: { total: 1, page: 1, limit: 20, pages: 1, hasMore: false },
};

export const mockAdminOrders: PaginatedOrders = {
  data: [
    {
      id: "order-1",
      orderNumber: "ORD-001",
      userId: "user-1",
      items: [],
      totalPrice: 199.99,
      status: "PENDING",
      paymentStatus: "SUCCEEDED",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
  ],
  meta: { total: 1, page: 1, limit: 20, pages: 1, hasMore: false },
};
