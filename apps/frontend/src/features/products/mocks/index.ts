import type {
  Category,
  Product,
  PaginatedProducts,
  CursorPageProducts,
} from "../interfaces";

export const mockCategory: Category = {
  id: "cat-1",
  name: "Electronics",
  slug: "electronics",
  description: "Electronic devices and accessories",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockProduct: Product = {
  id: "prod-1",
  name: "Wireless Headphones",
  slug: "wireless-headphones",
  description: "Premium noise-cancelling wireless headphones",
  price: 199.99,
  cost: 80,
  stock: 50,
  categoryId: "cat-1",
  category: mockCategory,
  images: [
    {
      id: "img-1",
      url: "https://placehold.co/400x400?text=Headphones",
      altText: "Wireless Headphones",
      isMain: true,
      order: 0,
    },
  ],
  variants: [],
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const mockProductList: Product[] = [
  mockProduct,
  {
    ...mockProduct,
    id: "prod-2",
    name: "Bluetooth Speaker",
    slug: "bluetooth-speaker",
    price: 89.99,
  },
  {
    ...mockProduct,
    id: "prod-3",
    name: "USB-C Hub",
    slug: "usb-c-hub",
    price: 49.99,
  },
];

export const mockPaginatedProducts: PaginatedProducts = {
  data: mockProductList,
  meta: { total: 3, page: 1, limit: 20, pages: 1, hasMore: false },
};

export const mockCursorProducts: CursorPageProducts = {
  data: mockProductList,
  meta: { limit: 20, hasMore: false, nextCursor: null },
};
