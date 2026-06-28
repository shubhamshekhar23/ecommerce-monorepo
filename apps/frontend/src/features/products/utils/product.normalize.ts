import type { Product } from "../interfaces";

// Listing and cursor endpoints return priceRange instead of a flat price field,
// and omit the stock field entirely. This normalizer bridges both gaps so every
// caller gets a Product where price and stock are always numbers.
interface ProductApiShape extends Omit<Product, "price" | "stock"> {
  price?: number;
  stock?: number;
  priceRange?: { min: number; max: number };
}

export function normalizeProduct(raw: Product): Product {
  const api = raw as ProductApiShape;
  const priceKnown = api.price !== undefined;
  const stockKnown = api.stock !== undefined;
  if (priceKnown && stockKnown) return raw;
  return {
    ...raw,
    price: priceKnown ? (raw.price as number) : (api.priceRange?.min ?? 0),
    // cursor/listing API omits stock — default to 1 so products show as available
    stock: stockKnown ? (api.stock as number) : 1,
  };
}
