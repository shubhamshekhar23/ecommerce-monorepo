export interface AnalyticsOrderItem {
  productId: string;
  quantity: number;
  price: number;
}

// Published to Kafka topic `order.placed` when an order is created.
// Analytics-service consumes this to build the co-purchase recommendation index.
export interface AnalyticsOrderEvent {
  orderId: string;
  userId: string;
  items: AnalyticsOrderItem[];
  totalAmount: number;
  placedAt: string; // ISO 8601
}
