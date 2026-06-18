import type { OrderStatus } from "../interfaces";

export function isOrderCancellable(status: OrderStatus): boolean {
  return (
    status === "PENDING" || status === "CONFIRMED" || status === "PROCESSING"
  );
}

export function formatOrderTotal(total: number): string {
  return `$${Number(total).toFixed(2)}`;
}

export function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
