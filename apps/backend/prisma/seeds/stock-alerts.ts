import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SeededUser } from './users';
import { SeededProduct } from './products';

export async function seedStockAlerts(
  prisma: PrismaClient,
  users: SeededUser[],
  products: SeededProduct[],
): Promise<void> {
  const regularUsers = users.filter((u) => u.email !== 'admin@ecommerce.com');

  // Only create alerts for products that have at least one out-of-stock variant
  const outOfStockProductIds = await prisma.productVariant
    .findMany({ where: { stock: 0 }, select: { productId: true }, distinct: ['productId'] })
    .then((rows) => rows.map((r) => r.productId));

  const eligibleProducts = products.filter((p) => outOfStockProductIds.includes(p.id));

  for (const product of eligibleProducts) {
    // 0–3 users subscribe to each out-of-stock product
    const subscribers = faker.helpers.arrayElements(
      regularUsers,
      faker.number.int({ min: 0, max: 3 }),
    );

    for (const user of subscribers) {
      await prisma.stockAlert.create({
        data: {
          productId: product.id,
          userId: user.id,
          email: user.email,
          notified: faker.datatype.boolean({ probability: 0.2 }),
          createdAt: faker.date.past({ years: 1 }),
        },
      }).catch(() => {}); // skip duplicate productId+userId
    }
  }

  const count = await prisma.stockAlert.count();
  console.log(`  ✓ ${count} stock alerts`);
}
