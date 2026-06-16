export const QUEUE_NAMES = {
  CART_RECOVERY: 'cart-recovery',
  INVOICES: 'invoices',
  STOCK_ALERTS: 'stock-alerts',
  DATA_ERASURE: 'data-erasure',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
