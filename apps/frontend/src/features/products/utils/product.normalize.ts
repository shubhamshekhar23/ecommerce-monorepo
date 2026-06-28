import type { Product } from "../interfaces";

// Listing and cursor endpoints return priceRange instead of a flat price field.
// The Zod schema marks price as optional on those responses; the shared Product
// interface still requires it. This normalizer bridges the gap so every caller
// gets a Product where price is always a number.
interface ProductApiShape extends Omit<Product, "price"> {
  price?: number;
  priceRange?: { min: number; max: number };
}

export function normalizeProduct(raw: Product): Product {
  const api = raw as ProductApiShape;
  if (api.price !== undefined) return raw;
  return {
    ...raw,
    price: api.priceRange?.min ?? 0,
  };
}
