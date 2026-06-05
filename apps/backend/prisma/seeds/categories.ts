import { PrismaClient } from '@prisma/client';

export interface CategoryNode {
  id: string;
  name: string;
  isLeaf: boolean;
}

const TREE = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and gadgets',
    children: [
      { name: 'Laptops', slug: 'laptops', description: 'Portable computers' },
      { name: 'Smartphones', slug: 'smartphones', description: 'Mobile phones' },
      { name: 'Tablets', slug: 'tablets', description: 'Tablet computers' },
      { name: 'Audio', slug: 'audio', description: 'Headphones, speakers and earbuds' },
      { name: 'Cameras', slug: 'cameras', description: 'Digital cameras and accessories' },
      { name: 'Computer Accessories', slug: 'computer-accessories', description: 'Peripherals and accessories' },
    ],
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Clothing and fashion items',
    children: [
      { name: "Men's Clothing", slug: 'mens-clothing', description: "Men's apparel" },
      { name: "Women's Clothing", slug: 'womens-clothing', description: "Women's apparel" },
      { name: 'Footwear', slug: 'footwear', description: 'Shoes and boots' },
      { name: 'Bags & Luggage', slug: 'bags-luggage', description: 'Bags, backpacks and luggage' },
      { name: 'Watches', slug: 'watches', description: 'Wristwatches and smartwatches' },
    ],
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Home furnishings and garden supplies',
    children: [
      { name: 'Furniture', slug: 'furniture', description: 'Chairs, tables and shelving' },
      { name: 'Kitchen', slug: 'kitchen', description: 'Cookware and kitchen appliances' },
      { name: 'Bedding', slug: 'bedding', description: 'Sheets, pillows and comforters' },
      { name: 'Lighting', slug: 'lighting', description: 'Lamps and light fixtures' },
    ],
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    description: 'Sports equipment and outdoor gear',
    children: [
      { name: 'Fitness Equipment', slug: 'fitness-equipment', description: 'Gym and home workout gear' },
      { name: 'Outdoor Gear', slug: 'outdoor-gear', description: 'Camping and hiking equipment' },
      { name: 'Cycling', slug: 'cycling', description: 'Bikes and cycling accessories' },
      { name: 'Team Sports', slug: 'team-sports', description: 'Balls, nets and team gear' },
    ],
  },
  {
    name: 'Books & Media',
    slug: 'books-media',
    description: 'Books, music and video',
    children: [
      { name: 'Books', slug: 'books', description: 'Fiction and non-fiction' },
      { name: 'Music', slug: 'music', description: 'CDs, vinyl and digital' },
      { name: 'Video Games', slug: 'video-games', description: 'Console and PC games' },
    ],
  },
];

export async function seedCategories(prisma: PrismaClient): Promise<CategoryNode[]> {
  const leafCategories: CategoryNode[] = [];

  for (const root of TREE) {
    const parent = await prisma.category.create({
      data: {
        name: root.name,
        slug: root.slug,
        description: root.description,
        isActive: true,
      },
    });

    for (const child of root.children) {
      const leaf = await prisma.category.create({
        data: {
          name: child.name,
          slug: child.slug,
          description: child.description,
          parentId: parent.id,
          isActive: true,
        },
      });
      leafCategories.push({ id: leaf.id, name: leaf.name, isLeaf: true });
    }
  }

  return leafCategories;
}
