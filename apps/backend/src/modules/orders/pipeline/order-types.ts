import { Prisma } from '@prisma/client';

export type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: { product: { include: { category: true } }; variant: true } } };
}>;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;

export type UserForOrder = {
  email: string;
  firstName: string | null;
  country: string;
  state?: string;
  orderCount: number;
  tier: string;
};
