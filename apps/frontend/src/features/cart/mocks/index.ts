import type { Cart, CartItem } from "../interfaces";

export const mockCartItem: CartItem = {
  id: "item-1",
  productId: "prod-1",
  product: {
    id: "prod-1",
    name: "Wireless Headphones",
    slug: "wireless-headphones",
    price: 199.99,
    cost: 80,
    stock: 50,
    categoryId: "cat-1",
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  quantity: 2,
  subtotal: 399.98,
};

export const mockCart: Cart = {
  id: "cart-1",
  userId: "user-1",
  items: [mockCartItem],
  itemCount: 2,
  totalPrice: 399.98,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockEmptyCart: Cart = {
  id: "cart-2",
  userId: "user-1",
  items: [],
  itemCount: 0,
  totalPrice: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};
