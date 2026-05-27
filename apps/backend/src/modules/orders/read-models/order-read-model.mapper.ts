import { Prisma } from '@prisma/client';
import { OrderReadModel } from './order-read-model.types';

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;

export function mapToOrderReadModel(order: OrderWithDetails): OrderReadModel {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalPrice: String(order.totalPrice),
    itemCount: order.items.length,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: String(item.price),
      subtotal: parseFloat(String(item.price)) * item.quantity,
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
