"use client";

// GA4 ecommerce funnel event tracking.
// All calls are no-ops when gtag is not loaded (dev without NEXT_PUBLIC_GA_MEASUREMENT_ID,
// or when user has rejected analytics consent).

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

// Track when a user views a product detail page.
export function trackViewItem(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}): void {
  gtag("event", "view_item", {
    currency: "USD",
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        item_category: product.category,
      },
    ],
  });
}

// Track when a user adds a product to cart.
export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}): void {
  gtag("event", "add_to_cart", {
    currency: "USD",
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      },
    ],
  });
}

// Track when a user starts checkout (reaches the checkout page).
export function trackBeginCheckout(total: number, itemCount: number): void {
  gtag("event", "begin_checkout", {
    currency: "USD",
    value: total,
    num_items: itemCount,
  });
}

// Track a completed purchase.
export function trackPurchase(order: {
  id: string;
  orderNumber: string;
  total: number;
  itemCount: number;
}): void {
  gtag("event", "purchase", {
    transaction_id: order.orderNumber,
    value: order.total,
    currency: "USD",
    num_items: order.itemCount,
  });
}
