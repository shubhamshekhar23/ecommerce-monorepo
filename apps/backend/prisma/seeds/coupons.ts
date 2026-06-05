import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { COUNTS } from './constants';
import { SeededCoupon } from './orders';

export async function seedCoupons(prisma: PrismaClient): Promise<SeededCoupon[]> {
  // Fixed well-known coupons for manual testing
  const fixed = [
    { code: 'SAVE10', type: 'PERCENTAGE' as const, value: 10, minOrderAmount: 50, maxUses: 1000 },
    { code: 'SAVE20', type: 'PERCENTAGE' as const, value: 20, minOrderAmount: 100, maxUses: 500 },
    { code: 'FLAT15', type: 'FIXED' as const, value: 15, minOrderAmount: 75, maxUses: 200 },
    { code: 'NEWUSER', type: 'PERCENTAGE' as const, value: 15, minOrderAmount: null, maxUses: null },
    { code: 'FREESHIP', type: 'FIXED' as const, value: 9.99, minOrderAmount: 30, maxUses: null },
  ];

  for (const c of fixed) {
    await prisma.coupon.create({
      data: {
        code: c.code,
        type: c.type,
        value: c.value,
        minOrderAmount: c.minOrderAmount,
        maxUses: c.maxUses,
        expiresAt: faker.date.future({ years: 1 }),
        isActive: true,
      },
    });
  }

  // Random generated coupons
  for (let i = 0; i < COUNTS.COUPONS - fixed.length; i++) {
    const type = faker.helpers.arrayElement(['PERCENTAGE', 'FIXED'] as const);
    const value = type === 'PERCENTAGE'
      ? faker.number.int({ min: 5, max: 50 })
      : faker.number.float({ min: 5, max: 100, fractionDigits: 2 });

    await prisma.coupon.create({
      data: {
        code: faker.string.alphanumeric(8).toUpperCase(),
        type,
        value,
        minOrderAmount: faker.datatype.boolean() ? faker.number.float({ min: 20, max: 200, fractionDigits: 2 }) : null,
        maxUses: faker.datatype.boolean() ? faker.number.int({ min: 50, max: 500 }) : null,
        usedCount: faker.number.int({ min: 0, max: 30 }),
        expiresAt: faker.datatype.boolean() ? faker.date.future({ years: 1 }) : null,
        isActive: faker.datatype.boolean({ probability: 0.8 }),
      },
    }).catch(() => {}); // skip rare code collision
  }

  const count = await prisma.coupon.count();
  console.log(`  ✓ ${count} coupons (including SAVE10, SAVE20, FLAT15, NEWUSER, FREESHIP)`);

  // Return active coupons for orders to reference
  const active = await prisma.coupon.findMany({
    where: { isActive: true },
    select: { id: true, code: true, type: true, value: true, minOrderAmount: true },
  });
  return active.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: Number(c.value),
    minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
  }));
}
