import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CartView } from "../CartView";
import { mockCart, mockEmptyCart, mockCartItem } from "../../../mocks";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/cart",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockRemoveItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockClearCart = jest.fn();

jest.mock("@/features/cart/hooks", () => ({
  useCart: jest.fn(),
  useRemoveCartItem: () => ({ mutate: mockRemoveItem, isPending: false }),
  useUpdateCartItem: () => ({ mutate: mockUpdateItem, isPending: false }),
  useClearCart: () => ({ mutate: mockClearCart, isPending: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useCart } = require("@/features/cart/hooks") as { useCart: jest.Mock };

describe("CartView", () => {
  beforeEach(() => {
    mockRemoveItem.mockClear();
    mockUpdateItem.mockClear();
    mockClearCart.mockClear();
  });

  describe("loading state", () => {
    it("renders a skeleton while the cart is loading", () => {
      useCart.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });
      const { container } = renderWithProviders(<CartView />);
      // Skeleton renders; the cart items list should not be present
      expect(screen.queryByText("Shopping Cart")).not.toBeInTheDocument();
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe("error state", () => {
    it("shows an error message when the cart fails to load", () => {
      useCart.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
      });
      renderWithProviders(<CartView />);
      expect(screen.getByText(/failed to load cart/i)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    beforeEach(() => {
      useCart.mockReturnValue({
        data: mockEmptyCart,
        isLoading: false,
        error: null,
      });
    });

    it("renders the empty state when the cart has no items", () => {
      renderWithProviders(<CartView />);
      expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    });

    it("shows a link to browse products", () => {
      renderWithProviders(<CartView />);
      expect(
        screen.getByRole("link", { name: /browse products/i }),
      ).toBeInTheDocument();
    });

    it("has no accessibility violations", async () => {
      const { container } = renderWithProviders(<CartView />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe("populated cart", () => {
    beforeEach(() => {
      useCart.mockReturnValue({
        data: mockCart,
        isLoading: false,
        error: null,
      });
    });

    it("renders the Shopping Cart heading", () => {
      renderWithProviders(<CartView />);
      expect(
        screen.getByRole("heading", { name: "Shopping Cart" }),
      ).toBeInTheDocument();
    });

    it("displays the product name from cart items", () => {
      renderWithProviders(<CartView />);
      expect(screen.getByText(mockCartItem.product.name)).toBeInTheDocument();
    });

    it("displays the item subtotal", () => {
      renderWithProviders(<CartView />);
      const subtotal = `$${Number(mockCartItem.subtotal).toFixed(2)}`;
      // Subtotal appears in CartItemRow; total also appears in CartSummary
      expect(screen.getAllByText(subtotal).length).toBeGreaterThanOrEqual(1);
    });

    it("calls removeItem mutation when Remove button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<CartView />);
      const removeBtn = screen.getByRole("button", {
        name: new RegExp(`remove ${mockCartItem.product.name}`, "i"),
      });
      await user.click(removeBtn);
      expect(mockRemoveItem).toHaveBeenCalledWith(mockCartItem.id);
    });

    it("calls updateItem when the Decrease quantity button is clicked (qty > 1)", async () => {
      const itemWithQty2 = { ...mockCartItem, quantity: 2 };
      useCart.mockReturnValue({
        data: { ...mockCart, items: [itemWithQty2] },
        isLoading: false,
        error: null,
      });
      const user = userEvent.setup();
      renderWithProviders(<CartView />);
      await user.click(
        screen.getByRole("button", { name: /decrease quantity/i }),
      );
      expect(mockUpdateItem).toHaveBeenCalledWith({
        itemId: mockCartItem.id,
        quantity: 1,
      });
    });

    it("disables Decrease button when quantity is 1", () => {
      const itemWithQty1 = { ...mockCartItem, quantity: 1 };
      useCart.mockReturnValue({
        data: { ...mockCart, items: [itemWithQty1] },
        isLoading: false,
        error: null,
      });
      renderWithProviders(<CartView />);
      expect(
        screen.getByRole("button", { name: /decrease quantity/i }),
      ).toBeDisabled();
    });

    it("has no accessibility violations", async () => {
      const { container } = renderWithProviders(<CartView />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
