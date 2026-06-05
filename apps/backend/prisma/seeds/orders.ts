import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SeededUser } from './users';
import { SeededProduct } from './products';
import { COUNTS, PAYMENT_STATUS_MAP } from './constants';

export interface SeededCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
}

const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
] as const;

// Weighted toward realistic distribution: most orders delivered
const STATUS_WEIGHTS = [5, 8, 10, 12, 50, 10, 5];

function pickWeightedStatus(): string {
  const total = STATUS_WEIGHTS.reduce((a, b) => a + b, 0);
  let rand = faker.number.int({ min: 0, max: total - 1 });
  for (let i = 0; i < ORDER_STATUSES.length; i++) {
    rand -= STATUS_WEIGHTS[i];
    if (rand < 0) return ORDER_STATUSES[i];
  }
  return 'DELIVERED';
}

let orderCounter = 1;

function orderNumber(date: Date): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${ymd}-${String(orderCounter++).padStart(4, '0')}`;
}

function applyDiscount(subtotal: number, coupon: SeededCoupon): number {
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) return 0;
  if (coupon.type === 'PERCENTAGE') return parseFloat((subtotal * coupon.value / 100).toFixed(2));
  return Math.min(parseFloat(coupon.value.toFixed(2)), subtotal);
}

export async function seedOrders(
  prisma: PrismaClient,
  users: SeededUser[],
  products: SeededProduct[],
  coupons: SeededCoupon[],
): Promise<void> {
  const regularUsers = users.filter((u) => u.email !== 'admin@ecommerce.com');

  for (const user of regularUsers) {
    const orderCount = faker.number.int({ min: 0, max: COUNTS.ORDERS_PER_USER });

    for (let i = 0; i < orderCount; i++) {
      const status = pickWeightedStatus();
      const paymentStatus = PAYMENT_STATUS_MAP[status];
      const createdAt = faker.date.past({ years: 2 });
      const itemCount = faker.number.int({ min: 1, max: 4 });
      const pickedProducts = faker.helpers.arrayElements(products, itemCount);

      const items = pickedProducts.map((p) => ({
        productId: p.id,
        quantity: faker.number.int({ min: 1, max: 5 }),
        price: p.price,
        variantAttributes: { Color: faker.color.human(), Size: faker.helpers.arrayElement(['S', 'M', 'L', 'XL']) },
      }));

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingCost = faker.number.float({ min: 0, max: 15, fractionDigits: 2 });
      const taxAmount = parseFloat((subtotal * 0.08).toFixed(2));

      // ~25% of paid orders use a coupon
      const isPaid = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(status);
      const useCoupon = isPaid && coupons.length > 0 && faker.datatype.boolean({ probability: 0.25 });
      const coupon = useCoupon ? faker.helpers.arrayElement(coupons) : null;
      const discountAmount = coupon ? applyDiscount(subtotal, coupon) : 0;

      const totalPrice = parseFloat((subtotal + shippingCost + taxAmount - discountAmount).toFixed(2));
      const paidAt = isPaid ? faker.date.soon({ days: 1, refDate: createdAt }) : null;

      const order = await prisma.order.create({
        data: {
          orderNumber: orderNumber(createdAt),
          userId: user.id,
          status: status as any,
          paymentStatus: paymentStatus as any,
          paymentIntentId: `pi_seed_${faker.string.alphanumeric(20)}`,
          subtotal: parseFloat(subtotal.toFixed(2)),
          shippingCost,
          taxAmount,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          couponId: coupon?.id ?? null,
          couponCode: coupon?.code ?? null,
          totalPrice,
          paidAt,
          createdAt,
          updatedAt: new Date(),
          shippingAddress: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            line1: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            country: 'US',
            postalCode: faker.location.zipCode(),
          },
          items: { create: items },
        },
      });

      if (coupon && discountAmount > 0) {
        await prisma.couponUsage.create({
          data: {
            couponId: coupon.id,
            orderId: order.id,
            userId: user.id,
          },
        }).catch(() => {}); // skip if same coupon+order already exists
      }
    }
  }

  const [orderCount, usageCount] = await Promise.all([
    prisma.order.count(),
    prisma.couponUsage.count(),
  ]);
  console.log(`  ✓ ${orderCount} orders (${usageCount} with coupons applied)`);
}
