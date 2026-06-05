import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { CategoryNode } from './categories';
import { COUNTS } from './constants';

export interface SeededProduct {
  id: string;
  slug: string;
  price: number;
  categoryName: string;
}

// Variant config per category type
const VARIANT_CONFIG: Record<string, { types: { name: string; options: string[] }[] }> = {
  default: {
    types: [{ name: 'Color', options: ['Black', 'White', 'Silver', 'Blue', 'Red'] }],
  },
  "Men's Clothing": {
    types: [
      { name: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Color', options: ['Black', 'White', 'Navy', 'Grey', 'Green'] },
    ],
  },
  "Women's Clothing": {
    types: [
      { name: 'Size', options: ['XS', 'S', 'M', 'L', 'XL'] },
      { name: 'Color', options: ['Black', 'White', 'Pink', 'Red', 'Purple'] },
    ],
  },
  Footwear: {
    types: [
      { name: 'Size', options: ['6', '7', '8', '9', '10', '11', '12'] },
      { name: 'Color', options: ['Black', 'Brown', 'White', 'Grey'] },
    ],
  },
  Laptops: {
    types: [
      { name: 'RAM', options: ['8GB', '16GB', '32GB'] },
      { name: 'Storage', options: ['256GB', '512GB', '1TB'] },
    ],
  },
  Smartphones: {
    types: [
      { name: 'Storage', options: ['64GB', '128GB', '256GB', '512GB'] },
      { name: 'Color', options: ['Black', 'White', 'Blue', 'Gold'] },
    ],
  },
  Audio: {
    types: [{ name: 'Color', options: ['Black', 'White', 'Rose Gold', 'Navy'] }],
  },
  Bedding: {
    types: [
      { name: 'Size', options: ['Twin', 'Full', 'Queen', 'King'] },
      { name: 'Color', options: ['White', 'Grey', 'Blue', 'Beige'] },
    ],
  },
  Watches: {
    types: [
      { name: 'Case Size', options: ['38mm', '42mm', '44mm'] },
      { name: 'Band Color', options: ['Black', 'Brown', 'Silver', 'Gold'] },
    ],
  },
};

function variantConfigFor(categoryName: string) {
  return VARIANT_CONFIG[categoryName] ?? VARIANT_CONFIG['default'];
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function createProductVariants(
  prisma: PrismaClient,
  productId: string,
  basePrice: number,
  categoryName: string,
): Promise<void> {
  const config = variantConfigFor(categoryName);
  const { types } = config;

  // Create VariantTypes + VariantOptions
  const createdTypes: { name: string; options: { id: string; value: string }[] }[] = [];

  for (const typeDef of types) {
    const vType = await prisma.variantType.create({
      data: { productId, name: typeDef.name },
    });

    const options = await Promise.all(
      typeDef.options.map((value) =>
        prisma.variantOption.create({ data: { variantTypeId: vType.id, value } }),
      ),
    );

    createdTypes.push({ name: typeDef.name, options });
  }

  // Build cartesian product of options (all combinations)
  const combos = cartesian(createdTypes.map((t) => t.options));

  // Limit to COUNTS.MAX_VARIANTS_PER_PRODUCT combinations
  const limited = combos.slice(0, COUNTS.MAX_VARIANTS_PER_PRODUCT);

  for (const combo of limited) {
    const skuParts = combo.map((o) => o.value.replace(/\s+/g, '-').toUpperCase());
    const sku = `${productId.slice(-6).toUpperCase()}-${skuParts.join('-')}`;
    const priceVariance = faker.number.float({ min: -0.1, max: 0.3, fractionDigits: 2 });
    const variantPrice = parseFloat((basePrice * (1 + priceVariance)).toFixed(2));

    const labelParts = combo.map((o) => o.value).join(' ');
    await prisma.productVariant.create({
      data: {
        productId,
        sku,
        price: variantPrice,
        cost: parseFloat((variantPrice * 0.5).toFixed(2)),
        stock: faker.number.int({ min: 0, max: 200 }),
        isActive: faker.datatype.boolean({ probability: 0.9 }),
        attributeValues: {
          create: combo.map((opt) => ({ optionId: opt.id })),
        },
        images: {
          create: Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, (_, idx) => ({
            url: `https://picsum.photos/seed/${sku}-${idx}/800/600`,
            altText: `${labelParts} - image ${idx + 1}`,
            isMain: idx === 0,
            order: idx,
          })),
        },
      },
    });
  }
}

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]],
  );
}

export async function seedProducts(
  prisma: PrismaClient,
  categories: CategoryNode[],
): Promise<SeededProduct[]> {
  const seededProducts: SeededProduct[] = [];
  const usedSlugs = new Set<string>();

  for (const category of categories) {
    for (let i = 0; i < COUNTS.PRODUCTS_PER_LEAF_CATEGORY; i++) {
      const name = `${faker.commerce.productAdjective()} ${faker.commerce.product()}`;
      let slug = slugify(name);
      // Ensure unique slug
      let attempt = 0;
      while (usedSlugs.has(slug)) {
        slug = `${slugify(name)}-${++attempt}`;
      }
      usedSlugs.add(slug);

      const price = parseFloat(faker.commerce.price({ min: 10, max: 2000 }));
      const imageCount = faker.number.int({ min: 1, max: 4 });

      // price/cost/stock no longer exist on Product — they live on ProductVariant
      const product = await prisma.product.create({
        data: {
          name,
          slug,
          description: faker.commerce.productDescription(),
          categoryId: category.id,
          isActive: faker.datatype.boolean({ probability: 0.9 }),
          createdAt: faker.date.past({ years: 2 }),
          updatedAt: new Date(),
          images: {
            create: Array.from({ length: imageCount }, (_, idx) => ({
              url: `https://picsum.photos/seed/${slug}-${idx}/800/600`,
              altText: `${name} image ${idx + 1}`,
              isMain: idx === 0,
              order: idx,
            })),
          },
        },
      });

      await createProductVariants(prisma, product.id, price, category.name);

      seededProducts.push({ id: product.id, slug, price, categoryName: category.name });
    }
  }

  console.log(`  ✓ ${seededProducts.length} products with variants`);
  return seededProducts;
}
