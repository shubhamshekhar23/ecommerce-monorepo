/**
 * Integration test: add-to-cart flow.
 * Renders Header (cart badge) + ProductCard together with real hooks.
 * The cart API layer is mocked so network calls are controlled.
 * Verifies the full path:
 *   ProductCard click → useAddToCart.mutate → addToCartApi (mocked)
 *   → onSuccess sets ['cart'] cache directly → Header re-renders with itemCount 1.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "jest-axe";
import { Header } from "@/components/Header/Header";
import { ProductCard } from "@/features/products";
import { useAuthStore } from "@/store/auth.store";
import type { Product } from "@/features/products/interfaces";
import type { Cart } from "@/features/cart/interfaces";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockProduct: Product = {
  id: "prod-1",
  name: "Blue Ceramic Mug",
  slug: "blue-ceramic-mug",
  description: "A nice mug",
  price: 24.99,
  cost: 12,
  stock: 5,
  categoryId: "cat-1",
  images: [
    {
      id: "img-1",
      url: "/mug.jpg",
      altText: "Blue mug",
      isMain: true,
      order: 0,
    },
  ],
  variants: [],
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const emptyCart: Cart = {
  id: "cart-1",
  userId: "user-1",
  items: [],
  itemCount: 0,
  totalPrice: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const cartWithItem: Cart = {
  id: "cart-1",
  userId: "user-1",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      product: {
        id: "prod-1",
        name: "Blue Ceramic Mug",
        slug: "blue-ceramic-mug",
        price: 24.99,
        cost: 12,
        stock: 5,
        categoryId: "cat-1",
        isActive: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      quantity: 1,
      subtotal: 24.99,
    },
  ],
  itemCount: 1,
  totalPrice: 24.99,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

// Mock the cart API layer — not the hooks — so the real QueryClient cache
// integration path (onSuccess → setQueryData → re-render) remains untouched.
// Return values are set in beforeEach to avoid jest.mock hoisting issues.
jest.mock("@/features/cart/api/cart.api", () => ({
  getCartApi: jest.fn(),
  addToCartApi: jest.fn(),
  updateCartItemApi: jest.fn(),
  removeCartItemApi: jest.fn(),
  clearCartApi: jest.fn(),
}));

jest.mock("@/features/auth/api/auth.api", () => ({
  logoutApi: jest.fn().mockResolvedValue(undefined),
  refreshTokenApi: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cartApi = require("@/features/cart/api/cart.api") as {
  addToCartApi: jest.Mock;
  getCartApi: jest.Mock;
};

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role: "USER" as const,
  isActive: true,
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderFlow(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <Header />
      <ProductCard product={mockProduct} />
    </QueryClientProvider>,
  );
}

describe("add-to-cart flow (Header + ProductCard integration)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // getCartApi returns cartWithItem for any re-fetch triggered by onSettled.
    // The initial render uses the pre-seeded emptyCart cache (fresh, no fetch fires).
    cartApi.getCartApi.mockResolvedValue(cartWithItem);
    cartApi.addToCartApi.mockResolvedValue(cartWithItem);
    queryClient = makeQueryClient();
    // Pre-seed empty cart so Header shows no badge on first render
    queryClient.setQueryData(["cart"], emptyCart);
    useAuthStore.setState({
      status: "authenticated",
      user: mockUser,
      accessToken: "token",
    });
  });

  afterEach(() => {
    queryClient.clear();
    useAuthStore.setState({
      status: "unauthenticated",
      user: null,
      accessToken: null,
    });
  });

  it("shows cart link with no item count before interaction", () => {
    renderFlow(queryClient);
    expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /cart,/i }),
    ).not.toBeInTheDocument();
  });

  it("updates the cart badge to 1 after clicking Add to Cart", async () => {
    const user = userEvent.setup();
    renderFlow(queryClient);

    // Cart link starts as 'Cart' (itemCount 0)
    expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    // onSuccess calls queryClient.setQueryData(['cart'], cartWithItem)
    // Header re-renders: aria-label becomes 'Cart, 1 item'
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Cart, 1 item" }),
      ).toBeInTheDocument();
    });
  });

  it("announces the updated count to screen readers via aria-live", async () => {
    const user = userEvent.setup();
    renderFlow(queryClient);

    await user.click(screen.getByRole("button", { name: /add to cart/i }));

    // sr-only aria-live span updates from '' to '1 item in cart'
    await waitFor(() => {
      expect(screen.getByText("1 item in cart")).toBeInTheDocument();
    });
  });

  it("passes accessibility checks before and after adding to cart", async () => {
    const user = userEvent.setup();
    const { container } = renderFlow(queryClient);

    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: /add to cart/i }));
    await waitFor(() => screen.getByRole("link", { name: "Cart, 1 item" }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
