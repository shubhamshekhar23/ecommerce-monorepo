import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SeededUser } from './users';
import { COUNTS } from './constants';

export async function seedAddresses(
  prisma: PrismaClient,
  users: SeededUser[],
): Promise<void> {
  const regularUsers = users.filter((u) => u.email !== 'admin@ecommerce.com');

  for (const user of regularUsers) {
    const count = faker.number.int({ min: 1, max: COUNTS.ADDRESSES_PER_USER });

    for (let i = 0; i < count; i++) {
      await prisma.address.create({
        data: {
          userId: user.id,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          line1: faker.location.streetAddress(),
          line2: faker.datatype.boolean({ probability: 0.3 }) ? faker.location.secondaryAddress() : null,
          city: faker.location.city(),
          state: faker.location.state(),
          country: 'US',
          postalCode: faker.location.zipCode(),
          isDefault: i === 0,
        },
      });
    }
  }

  const count = await prisma.address.count();
  console.log(`  ✓ ${count} addresses`);
}
