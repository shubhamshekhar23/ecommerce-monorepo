import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/users';
import { seedCategories } from './seeds/categories';
import { seedProducts } from './seeds/products';
import { seedOrders } from './seeds/orders';
import { seedReviews } from './seeds/reviews';
import { seedCoupons } from './seeds/coupons';
import { seedAddresses } from './seeds/addresses';
import { seedCarts } from './seeds/carts';
import { seedStockAlerts } from './seeds/stock-alerts';
import { seedReturns } from './seeds/returns';
import { seedAuditLog } from './seeds/audit-log';
import { seedOutboxEvents } from './seeds/outbox-events';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL },
  },
});

async function clearAll() {
  console.log('🗑️  Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.returnItem.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.stockAlert.deleteMany();
  await prisma.productRating.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.variantAttributeValue.deleteMany();
  await prisma.variantImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.variantOption.deleteMany();
  await prisma.variantType.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.address.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('🌱 Extensive seed starting...\n');
  const start = Date.now();

  await clearAll();
  console.log('');

  console.log('👥 Users...');
  const users = await seedUsers(prisma);

  console.log('📁 Categories...');
  const categories = await seedCategories(prisma);

  console.log('🛍️  Products + variants + variant images...');
  const products = await seedProducts(prisma, categories);

  console.log('🏠 Addresses...');
  await seedAddresses(prisma, users);

  // Coupons before orders — orders need coupon IDs to create CouponUsage rows
  console.log('🎟️  Coupons...');
  const coupons = await seedCoupons(prisma);

  console.log('📦 Orders + coupon usage...');
  await seedOrders(prisma, users, products, coupons);

  console.log('🛒 Carts...');
  await seedCarts(prisma, users, products);

  console.log('⭐ Reviews...');
  await seedReviews(prisma, users, products);

  console.log('🔔 Stock alerts...');
  await seedStockAlerts(prisma, users, products);

  console.log('↩️  Returns...');
  await seedReturns(prisma);

  // Build entity ID maps for audit log + outbox (use real IDs so entries look authentic)
  const [userIds, productIds, orderIds, returnIds] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }).then((r) => r.map((x) => x.id)),
    prisma.product.findMany({ select: { id: true } }).then((r) => r.map((x) => x.id)),
    prisma.order.findMany({ select: { id: true } }).then((r) => r.map((x) => x.id)),
    prisma.returnRequest.findMany({ select: { id: true } }).then((r) => r.map((x) => x.id)),
  ]);
  const entityIds = { User: userIds, Product: productIds, Order: orderIds, ReturnRequest: returnIds };

  console.log('📋 Audit log...');
  await seedAuditLog(prisma, users, entityIds);

  console.log('📤 Outbox events...');
  await seedOutboxEvents(prisma, entityIds);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s`);
  console.log('\n🔐 Test credentials:');
  console.log('   admin@ecommerce.com  /  Admin@123');
  console.log('   any other user       /  Password@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
