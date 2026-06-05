import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SeededUser } from './users';
import { SeededProduct } from './products';

export async function seedCarts(
  prisma: PrismaClient,
  users: SeededUser[],
  products: SeededProduct[],
): Promise<void> {
  const regularUsers = users.filter((u) => u.email !== 'admin@ecommerce.com');

  // ~70% of users have an active cart
  const usersWithCart = regularUsers.filter(() => faker.datatype.boolean({ probability: 0.7 }));

  for (const user of usersWithCart) {
    const itemCount = faker.number.int({ min: 1, max: 5 });
    const pickedProducts = faker.helpers.arrayElements(products, itemCount);

    // Fetch a real variant for each product so variantId is valid
    const items: { productId: string; variantId: string; quantity: number }[] = [];
    for (const p of pickedProducts) {
      const variant = await prisma.productVariant.findFirst({
        where: { productId: p.id, isActive: true },
        select: { id: true },
      });
      if (!variant) continue;
      items.push({
        productId: p.id,
        variantId: variant.id,
        quantity: faker.number.int({ min: 1, max: 4 }),
      });
    }

    if (items.length === 0) continue;

    await prisma.cart.create({
      data: {
        userId: user.id,
        items: { create: items },
      },
    });
  }

  const [carts, cartItems] = await Promise.all([
    prisma.cart.count(),
    prisma.cartItem.count(),
  ]);
  console.log(`  ✓ ${carts} carts, ${cartItems} cart items`);
}
