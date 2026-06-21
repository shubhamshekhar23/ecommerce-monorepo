import {
  normalizeCartItems,
  denormalizeCartItems,
  selectCartItems,
  selectCartItemById,
  selectCartItemByProductId,
  recalcCartTotals,
} from "../cart.normalize";
import { mockCart, mockCartItem, mockEmptyCart } from "../../mocks";
import type { CartItem } from "../../interfaces";

const makeItem = (overrides: Partial<CartItem>): CartItem => ({
  ...mockCartItem,
  ...overrides,
});

describe("normalizeCartItems", () => {
  it("returns empty byId and allIds for empty array", () => {
    const result = normalizeCartItems([]);
    expect(result.byId).toEqual({});
    expect(result.allIds).toEqual([]);
  });

  it("indexes items by id", () => {
    const result = normalizeCartItems([mockCartItem]);
    expect(result.byId["item-1"]).toBe(mockCartItem);
  });

  it("preserves insertion order in allIds", () => {
    const items = [
      makeItem({ id: "a" }),
      makeItem({ id: "b" }),
      makeItem({ id: "c" }),
    ];
    expect(normalizeCartItems(items).allIds).toEqual(["a", "b", "c"]);
  });

  it("handles multiple items correctly", () => {
    const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
    const result = normalizeCartItems(items);
    expect(Object.keys(result.byId)).toHaveLength(2);
    expect(result.allIds).toHaveLength(2);
  });
});

describe("denormalizeCartItems", () => {
  it("returns empty array for empty normalized state", () => {
    expect(denormalizeCartItems({ byId: {}, allIds: [] })).toEqual([]);
  });

  it("reconstructs items in allIds order", () => {
    const a = makeItem({ id: "a" });
    const b = makeItem({ id: "b" });
    expect(denormalizeCartItems(normalizeCartItems([a, b]))).toEqual([a, b]);
  });

  it("is the inverse of normalizeCartItems", () => {
    const items = [makeItem({ id: "x" }), makeItem({ id: "y" })];
    expect(denormalizeCartItems(normalizeCartItems(items))).toEqual(items);
  });
});

describe("selectCartItems", () => {
  it("returns the items array from a populated cart", () => {
    expect(selectCartItems(mockCart)).toBe(mockCart.items);
  });

  it("returns empty array for an empty cart", () => {
    expect(selectCartItems(mockEmptyCart)).toEqual([]);
  });
});

describe("selectCartItemById", () => {
  it("finds an item by its id", () => {
    expect(selectCartItemById(mockCart, "item-1")).toBe(mockCartItem);
  });

  it("returns undefined when id is not found", () => {
    expect(selectCartItemById(mockCart, "missing")).toBeUndefined();
  });
});

describe("selectCartItemByProductId", () => {
  it("finds an item by its productId", () => {
    expect(selectCartItemByProductId(mockCart, "prod-1")).toBe(mockCartItem);
  });

  it("returns undefined when productId is not found", () => {
    expect(selectCartItemByProductId(mockCart, "missing-prod")).toBeUndefined();
  });
});

describe("recalcCartTotals", () => {
  it("returns zero totals for empty items", () => {
    expect(recalcCartTotals([])).toEqual({ itemCount: 0, totalPrice: 0 });
  });

  it("counts items correctly", () => {
    const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
    expect(recalcCartTotals(items).itemCount).toBe(2);
  });

  it("sums subtotals correctly", () => {
    const items = [
      makeItem({ id: "a", subtotal: 9.99 }),
      makeItem({ id: "b", subtotal: 19.99 }),
    ];
    expect(recalcCartTotals(items).totalPrice).toBeCloseTo(29.98);
  });

  it("uses the existing mockCartItem subtotal", () => {
    expect(recalcCartTotals([mockCartItem]).totalPrice).toBe(399.98);
  });
});
