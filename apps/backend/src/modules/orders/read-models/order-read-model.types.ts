export interface OrderItemReadModel {
  id: string;
  productId: string;
  productName: string;
  categoryName: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderReadModel {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  itemCount: number;
  items: OrderItemReadModel[];
  createdAt: string;
  updatedAt: string;
}
