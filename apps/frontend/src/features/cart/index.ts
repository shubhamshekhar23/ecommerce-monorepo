// Public API — import from here, not from internal paths
export { CartView } from "./components/CartView/CartView";
export { CartSummary } from "./components/CartSummary/CartSummary";
export { CartItemRow } from "./components/CartItemRow/CartItemRow";
export { CartSkeleton } from "./components/CartSkeleton/CartSkeleton";

export { useCart } from "./hooks/useCart";
export { useAddToCart } from "./hooks/useAddToCart";
export { useRemoveCartItem } from "./hooks/useRemoveCartItem";
export { useUpdateCartItem } from "./hooks/useUpdateCartItem";
export { useClearCart } from "./hooks/useClearCart";

export type {
  Cart,
  CartItem,
  CartProduct,
  AddToCartPayload,
  UpdateCartItemPayload,
} from "./interfaces";
