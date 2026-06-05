import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { COUNTS } from './constants';

export interface SeededUser {
  id: string;
  email: string;
}

const HASHED_PASSWORD = bcrypt.hashSync('Password@123', 10);

export async function seedUsers(prisma: PrismaClient): Promise<SeededUser[]> {
  // Fixed admin always created first
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecommerce.com',
      password: bcrypt.hashSync('Admin@123', 10),
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });

  const regularUsers: SeededUser[] = [];

  // Batch in chunks of 50 to avoid overloading the connection pool
  const BATCH = 50;
  for (let i = 0; i < COUNTS.USERS; i += BATCH) {
    const chunk = Array.from({ length: Math.min(BATCH, COUNTS.USERS - i) }, () => ({
      email: faker.internet.email().toLowerCase(),
      password: HASHED_PASSWORD,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: 'USER' as const,
      emailVerified: faker.datatype.boolean({ probability: 0.85 }),
      isActive: faker.datatype.boolean({ probability: 0.95 }),
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: new Date(),
    }));

    await prisma.user.createMany({ data: chunk, skipDuplicates: true });
  }

  const dbUsers = await prisma.user.findMany({
    where: { role: 'USER' },
    select: { id: true, email: true },
  });

  regularUsers.push(...dbUsers);

  console.log(`  ✓ ${regularUsers.length} regular users + 1 admin  (password: Password@123)`);
  return [{ id: admin.id, email: admin.email }, ...regularUsers];
}
