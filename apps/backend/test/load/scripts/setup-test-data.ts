import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/*
 - Upserts load-test fixtures using fixed UUIDs from test-data.json.
 - Additive only — never deletes existing seed data.
 - Idempotent: safe to run multiple times.
 - Run before any Artillery scenario that requires auth or cart operations.
*/

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL } },
});

const IDS = {
  category: '550e8400-e29b-41d4-a716-446655440200',
  users: {
    one: '550e8400-e29b-41d4-a716-446655440100',
    two: '550e8400-e29b-41d4-a716-446655440101',
  },
  products: {
    one: '550e8400-e29b-41d4-a716-446655440000',
    two: '550e8400-e29b-41d4-a716-446655440001',
    three: '550e8400-e29b-41d4-a716-446655440002',
  },
  variants: {
    one: '550e8400-e29b-41d4-a716-446655440300',
    two: '550e8400-e29b-41d4-a716-446655440301',
    three: '550e8400-e29b-41d4-a716-446655440302',
  },
};

const HASHED_PASSWORD = bcrypt.hashSync('LoadTest123!', 10);

async function seedCategory(): Promise<void> {
  await prisma.category.upsert({
    where: { id: IDS.category },
    update: {},
    create: { id: IDS.category, name: 'Load Test Category', slug: 'load-test-category', isActive: true },
  });
  console.log('✓ Category');
}

async function seedUsers(): Promise<void> {
  await Promise.all([
    prisma.user.upsert({
      where: { id: IDS.users.one },
      update: {},
      create: {
        id: IDS.users.one,
        email: 'loadtest1@example.com',
        password: HASHED_PASSWORD,
        firstName: 'Load',
        lastName: 'Tester1',
        role: 'USER',
        emailVerified: true,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { id: IDS.users.two },
      update: {},
      create: {
        id: IDS.users.two,
        email: 'loadtest2@example.com',
        password: HASHED_PASSWORD,
        firstName: 'Load',
        lastName: 'Tester2',
        role: 'USER',
        emailVerified: true,
        isActive: true,
      },
    }),
  ]);
  console.log('✓ Users (loadtest1@example.com, loadtest2@example.com / LoadTest123!)');
}

const PRODUCT_DATA = [
  { id: IDS.products.one, name: 'Load Test Product 1', slug: 'load-test-product-1', price: '99.99', variantId: IDS.variants.one, sku: 'LT-PROD-1-STD' },
  { id: IDS.products.two, name: 'Load Test Product 2', slug: 'load-test-product-2', price: '49.99', variantId: IDS.variants.two, sku: 'LT-PROD-2-STD' },
  { id: IDS.products.three, name: 'Load Test Product 3', slug: 'load-test-product-3', price: '199.99', variantId: IDS.variants.three, sku: 'LT-PROD-3-STD' },
];

async function seedProducts(): Promise<void> {
  for (const p of PRODUCT_DATA) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, name: p.name, slug: p.slug, categoryId: IDS.category, isActive: true },
    });
    await prisma.productVariant.upsert({
      where: { id: p.variantId },
      update: {},
      create: { id: p.variantId, productId: p.id, sku: p.sku, price: p.price, cost: '0', stock: 10000, isActive: true },
    });
  }
  console.log('✓ Products + variants (stock: 10000 each)');
}

async function main(): Promise<void> {
  console.log('Setting up load test fixtures...\n');
  await seedCategory();
  await seedUsers();
  await seedProducts();
  console.log('\nLoad test fixtures ready.');
}

main()
  .catch((e) => {
    console.error('Setup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
