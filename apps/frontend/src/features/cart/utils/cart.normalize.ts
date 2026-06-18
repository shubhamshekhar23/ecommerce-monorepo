import type { Cart, CartItem } from "../interfaces";

/**
 * Normalized cart shape for O(1) item lookups during optimistic updates.
 * The TanStack Query cache stores Cart (flat array); this structure is used
 * internally in mutations to avoid .find() / .map() traversals.
 */
export interface NormalizedCartItems {
  byId: Record<string, CartItem>;
  allIds: string[];
}

export function normalizeCartItems(items: CartItem[]): NormalizedCartItems {
  return {
    byId: Object.fromEntries(items.map((item) => [item.id, item])),
    allIds: items.map((item) => item.id),
  };
}

export function denormalizeCartItems(
  normalized: NormalizedCartItems,
): CartItem[] {
  return normalized.allIds.map((id) => normalized.byId[id]);
}

/** Selector: always read cart items through this — never access items array directly in components */
export function selectCartItems(cart: Cart): CartItem[] {
  return cart.items;
}

export function selectCartItemById(
  cart: Cart,
  itemId: string,
): CartItem | undefined {
  return cart.items.find((item) => item.id === itemId);
}

export function selectCartItemByProductId(
  cart: Cart,
  productId: string,
): CartItem | undefined {
  return cart.items.find((item) => item.productId === productId);
}

export function recalcCartTotals(
  items: CartItem[],
): Pick<Cart, "itemCount" | "totalPrice"> {
  return {
    itemCount: items.length,
    totalPrice: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}
