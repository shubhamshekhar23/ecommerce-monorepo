export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING: "var(--color-warning)",
  CONFIRMED: "var(--color-info)",
  PROCESSING: "var(--color-info)",
  SHIPPED: "var(--color-accent)",
  DELIVERED: "var(--color-success)",
  CANCELLED: "var(--color-error)",
  REFUNDED: "var(--color-text-muted)",
};
