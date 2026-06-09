import { PrismaClient } from '@prisma/client';

/*
 - Removes only the fixtures inserted by setup-test-data.ts.
 - Deletes in FK-safe order: variants → products → category, cart items → users.
 - Does not touch any other seed data.
*/

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL } },
});

const IDS = {
  category: '550e8400-e29b-41d4-a716-446655440200',
  users: ['550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440101'],
  products: [
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
  ],
  variants: [
    '550e8400-e29b-41d4-a716-446655440300',
    '550e8400-e29b-41d4-a716-446655440301',
    '550e8400-e29b-41d4-a716-446655440302',
  ],
};

async function main(): Promise<void> {
  console.log('Cleaning up load test fixtures...\n');

  await prisma.cartItem.deleteMany({ where: { variantId: { in: IDS.variants } } });
  await prisma.orderItem.deleteMany({ where: { productId: { in: IDS.products } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: IDS.variants } } });
  await prisma.product.deleteMany({ where: { id: { in: IDS.products } } });
  await prisma.category.deleteMany({ where: { id: IDS.category } });
  console.log('✓ Products, variants, category');

  await prisma.refreshToken.deleteMany({ where: { userId: { in: IDS.users } } });
  await prisma.cart.deleteMany({ where: { userId: { in: IDS.users } } });
  await prisma.order.deleteMany({ where: { userId: { in: IDS.users } } });
  await prisma.user.deleteMany({ where: { id: { in: IDS.users } } });
  console.log('✓ Users');

  console.log('\nCleanup complete.');
}

main()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
