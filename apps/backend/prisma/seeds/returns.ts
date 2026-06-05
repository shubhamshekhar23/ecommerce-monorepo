import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const RETURN_REASONS = [
  'Item arrived damaged',
  'Wrong item received',
  'Item not as described',
  'Changed my mind',
  'Found a better price elsewhere',
  'Quality not as expected',
  'Ordered by mistake',
];

const RETURN_STATUSES = ['PENDING', 'APPROVED', 'APPROVED', 'REJECTED', 'REFUNDED'] as const;

export async function seedReturns(prisma: PrismaClient): Promise<void> {
  // Only DELIVERED orders are eligible for returns
  const deliveredOrders = await prisma.order.findMany({
    where: { status: 'DELIVERED' },
    include: { items: true },
  });

  // ~20% of delivered orders have a return request
  const returningOrders = deliveredOrders.filter(() =>
    faker.datatype.boolean({ probability: 0.2 }),
  );

  for (const order of returningOrders) {
    if (order.items.length === 0) continue;

    const status = faker.helpers.arrayElement(RETURN_STATUSES);
    const refundId = status === 'REFUNDED' ? `re_seed_${faker.string.alphanumeric(20)}` : null;

    // Return 1 to all items
    const itemsToReturn = faker.helpers.arrayElements(
      order.items,
      faker.number.int({ min: 1, max: order.items.length }),
    );

    await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        reason: faker.helpers.arrayElement(RETURN_REASONS),
        status,
        refundId,
        createdAt: faker.date.soon({ days: 30, refDate: order.createdAt }),
        updatedAt: new Date(),
        items: {
          create: itemsToReturn.map((item) => ({
            orderItemId: item.id,
            quantity: faker.number.int({ min: 1, max: item.quantity }),
            reason: faker.helpers.arrayElement(RETURN_REASONS),
          })),
        },
      },
    });
  }

  const [requests, items] = await Promise.all([
    prisma.returnRequest.count(),
    prisma.returnItem.count(),
  ]);
  console.log(`  ✓ ${requests} return requests, ${items} return items`);
}
