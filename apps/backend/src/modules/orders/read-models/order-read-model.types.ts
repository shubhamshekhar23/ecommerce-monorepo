export interface OrderItemReadModel {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: string;
  subtotal: number;
}

export interface OrderReadModel {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  paymentStatus: string;
  totalPrice: string;
  itemCount: number;
  items: OrderItemReadModel[];
  createdAt: string;
  updatedAt: string;
}
