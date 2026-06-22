import React from "react";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CartItemRow } from "../CartItemRow";
import { mockCartItem } from "../../../mocks";
import type { CartItem } from "../../../interfaces";

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

const mockUpdateItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock("@/features/cart/hooks", () => ({
  useUpdateCartItem: () => ({ mutate: mockUpdateItem, isPending: false }),
  useRemoveCartItem: () => ({ mutate: mockRemoveItem, isPending: false }),
  useCartTotalsWorker: () => null,
}));

describe("CartItemRow", () => {
  beforeEach(() => {
    mockUpdateItem.mockClear();
    mockRemoveItem.mockClear();
  });

  it("renders item name, price, quantity, and subtotal", () => {
    renderWithProviders(<CartItemRow item={mockCartItem} />);
    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    expect(screen.getByText("$199.99 each")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("$399.98")).toBeInTheDocument();
  });

  it("calls updateItem with decremented quantity on − click", async () => {
    const { getByLabelText } = renderWithProviders(
      <CartItemRow item={mockCartItem} />,
    );
    getByLabelText("Decrease quantity").click();
    expect(mockUpdateItem).toHaveBeenCalledWith({
      itemId: mockCartItem.id,
      quantity: 1,
    });
  });

  it("does not decrement below quantity 1", () => {
    renderWithProviders(
      <CartItemRow item={{ ...mockCartItem, quantity: 1 }} />,
    );
    expect(screen.getByLabelText("Decrease quantity")).toBeDisabled();
  });

  it("calls removeItem on Remove click", () => {
    const { getByRole } = renderWithProviders(
      <CartItemRow item={mockCartItem} />,
    );
    getByRole("button", { name: /remove wireless headphones/i }).click();
    expect(mockRemoveItem).toHaveBeenCalledWith(mockCartItem.id);
  });

  it("does not re-render when parent re-renders with unchanged props", () => {
    const items: CartItem[] = Array.from({ length: 10 }, (_, i) => ({
      ...mockCartItem,
      id: `item-${i}`,
    }));
    const renderCounts: Record<string, number> = {};

    function TestList() {
      const [, bump] = React.useReducer((n: number) => n + 1, 0);
      return (
        <>
          <button onClick={bump}>re-render parent</button>
          {items.map((item) => (
            <React.Profiler
              key={item.id}
              id={item.id}
              onRender={() => {
                renderCounts[item.id] = (renderCounts[item.id] ?? 0) + 1;
              }}
            >
              <CartItemRow item={item} />
            </React.Profiler>
          ))}
        </>
      );
    }

    const { getByText } = renderWithProviders(<TestList />);

    // Trigger a parent re-render — CartItemRow is memoized so no item should
    // re-render when its props have not changed.
    React.act(() => {
      getByText("re-render parent").click();
    });

    const totalAfterParentRerender = Object.values(renderCounts).reduce(
      (a, b) => a + b,
      0,
    );
    // Each row rendered exactly once (initial mount). Total ≤ 10 means no
    // unnecessary re-renders occurred after the parent state bump.
    expect(totalAfterParentRerender).toBeLessThanOrEqual(10);
  });
});
