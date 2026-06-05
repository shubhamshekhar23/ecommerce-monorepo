import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SeededUser } from './users';
import { SeededProduct } from './products';
import { COUNTS } from './constants';

const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'APPROVED', 'APPROVED', 'REJECTED'] as const;

export async function seedReviews(
  prisma: PrismaClient,
  users: SeededUser[],
  products: SeededProduct[],
): Promise<void> {
  const regularUsers = users.filter((u) => u.email !== 'admin@ecommerce.com');

  for (const product of products) {
    const reviewerCount = faker.number.int({ min: 0, max: COUNTS.REVIEWS_PER_PRODUCT });
    const reviewers = faker.helpers.arrayElements(regularUsers, reviewerCount);

    for (const reviewer of reviewers) {
      const status = faker.helpers.arrayElement(REVIEW_STATUSES);
      const rating = faker.number.int({ min: 1, max: 5 });

      await prisma.productReview.create({
        data: {
          productId: product.id,
          userId: reviewer.id,
          rating,
          title: faker.lorem.sentence({ min: 3, max: 8 }),
          body: faker.lorem.paragraph({ min: 1, max: 4 }),
          status,
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: new Date(),
        },
      }).catch(() => { /* skip duplicate productId+userId */ });
    }

    // Materialise the rating aggregate for approved reviews
    const approved = await prisma.productReview.findMany({
      where: { productId: product.id, status: 'APPROVED' },
      select: { rating: true },
    });

    if (approved.length > 0) {
      const avg = approved.reduce((s, r) => s + r.rating, 0) / approved.length;
      await prisma.productRating.upsert({
        where: { productId: product.id },
        create: { productId: product.id, avgRating: parseFloat(avg.toFixed(2)), reviewCount: approved.length, updatedAt: new Date() },
        update: { avgRating: parseFloat(avg.toFixed(2)), reviewCount: approved.length, updatedAt: new Date() },
      });
    }
  }

  const count = await prisma.productReview.count();
  console.log(`  ✓ ${count} reviews (with ProductRating aggregates)`);
}
