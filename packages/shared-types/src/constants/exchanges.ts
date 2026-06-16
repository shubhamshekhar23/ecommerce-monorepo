// Central registry for all RabbitMQ exchange/queue/routing-key names.
// Both publisher (monolith) and consumer (notification-service, search-service)
// import from here so a typo in one file becomes a compile error, not a silent miss.

export const EXCHANGES = {
  ORDER: 'order.events',
  PRODUCT: 'product.events',
  REVIEW: 'review.events',
  USER: 'user.events',
} as const;

export const QUEUES = {
  ORDER_NOTIFICATIONS: 'notification.order',
  ORDER_NOTIFICATIONS_DLQ: 'notification.order.dlq',
  PRODUCT_SEARCH_INDEX: 'search.product',
  REVIEW_RATING: 'review.rating',
  REVIEW_NOTIFICATIONS: 'notification.review',
  REVIEW_AUDIT: 'audit.review',
} as const;

export const ROUTING_KEYS = {
  ORDER: {
    PLACED: 'order.placed',
    SHIPPED: 'order.shipped',
    CANCELLED: 'order.cancelled',
  },
  PRODUCT: {
    CREATED: 'product.created',
    UPDATED: 'product.updated',
    DELETED: 'product.deleted',
  },
  REVIEW: {
    APPROVED: 'review.approved',
    REJECTED: 'review.rejected',
  },
  USER: {
    REGISTERED: 'user.registered',
  },
} as const;
