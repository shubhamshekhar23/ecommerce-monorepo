export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  CART_RECOVERY: 'cart-recovery',
  INVOICES: 'invoices',
  STOCK_ALERTS: 'stock-alerts',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
