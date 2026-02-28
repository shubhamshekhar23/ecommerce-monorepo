import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (optional - remove if you want to preserve data)
  console.log('🗑️  Clearing existing data...');
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Hash password helper
  const hashPassword = async (password: string) => {
    return bcrypt.hash(password, 12);
  };

  // Create Users
  console.log('👥 Creating users...');
  const adminPassword = await hashPassword('Admin@123');
  const userPassword = await hashPassword('User@123');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecommerce.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@example.com',
        password: userPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        emailVerified: true,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@example.com',
        password: userPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'USER',
        emailVerified: true,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike.johnson@example.com',
        password: userPassword,
        firstName: 'Mike',
        lastName: 'Johnson',
        role: 'USER',
        emailVerified: true,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'sarah.williams@example.com',
        password: userPassword,
        firstName: 'Sarah',
        lastName: 'Williams',
        role: 'USER',
        emailVerified: true,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'david.brown@example.com',
        password: userPassword,
        firstName: 'David',
        lastName: 'Brown',
        role: 'USER',
        emailVerified: true,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users + 1 admin\n`);

  // Create Categories
  console.log('📁 Creating categories...');
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      isActive: true,
    },
  });

  const computers = await prisma.category.create({
    data: {
      name: 'Computers',
      slug: 'computers',
      description: 'Laptops and desktop computers',
      parentId: electronics.id,
      isActive: true,
    },
  });

  const accessories = await prisma.category.create({
    data: {
      name: 'Accessories',
      slug: 'accessories',
      description: 'Computer accessories and peripherals',
      parentId: electronics.id,
      isActive: true,
    },
  });

  const fashion = await prisma.category.create({
    data: {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Clothing and fashion items',
      isActive: true,
    },
  });

  const mens = await prisma.category.create({
    data: {
      name: "Men's Clothing",
      slug: 'mens-clothing',
      description: "Men's fashion and apparel",
      parentId: fashion.id,
      isActive: true,
    },
  });

  const womens = await prisma.category.create({
    data: {
      name: "Women's Clothing",
      slug: 'womens-clothing',
      description: "Women's fashion and apparel",
      parentId: fashion.id,
      isActive: true,
    },
  });

  console.log('✅ Created 6 categories\n');

  // Create Products
  console.log('🛍️  Creating products...');
  const productData = [
    {
      name: 'MacBook Pro 14"',
      slug: 'macbook-pro-14',
      description:
        'Powerful laptop with M3 Pro chip, 16GB RAM, 512GB SSD. Perfect for professionals.',
      price: '1999.99',
      cost: '1200.00',
      stock: 25,
      categoryId: computers.id,
      images: [
        {
          url: '/uploads/products/2024/01/macbook-pro.jpg',
          altText: 'MacBook Pro 14 inch',
          isMain: true,
        },
        {
          url: '/uploads/products/2024/01/macbook-pro-side.jpg',
          altText: 'MacBook Pro side view',
          isMain: false,
        },
      ],
    },
    {
      name: 'Dell XPS 13',
      slug: 'dell-xps-13',
      description: 'Compact and lightweight laptop with Intel Core i7, 16GB RAM, 512GB SSD.',
      price: '1299.99',
      cost: '800.00',
      stock: 30,
      categoryId: computers.id,
      images: [
        {
          url: '/uploads/products/2024/01/dell-xps-13.jpg',
          altText: 'Dell XPS 13',
          isMain: true,
        },
      ],
    },
    {
      name: 'Wireless Mouse',
      slug: 'wireless-mouse',
      description: 'Ergonomic wireless mouse with 2.4GHz connection, 18-month battery life.',
      price: '29.99',
      cost: '10.00',
      stock: 150,
      categoryId: accessories.id,
      images: [
        {
          url: '/uploads/products/2024/01/wireless-mouse.jpg',
          altText: 'Wireless Mouse',
          isMain: true,
        },
      ],
    },
    {
      name: 'Mechanical Keyboard',
      slug: 'mechanical-keyboard',
      description: 'RGB mechanical keyboard with Cherry MX switches, programmable keys.',
      price: '149.99',
      cost: '70.00',
      stock: 80,
      categoryId: accessories.id,
      images: [
        {
          url: '/uploads/products/2024/01/mechanical-keyboard.jpg',
          altText: 'Mechanical Keyboard',
          isMain: true,
        },
      ],
    },
    {
      name: 'USB-C Hub',
      slug: 'usb-c-hub',
      description: '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader, and charging.',
      price: '49.99',
      cost: '20.00',
      stock: 200,
      categoryId: accessories.id,
      images: [
        {
          url: '/uploads/products/2024/01/usb-c-hub.jpg',
          altText: 'USB-C Hub',
          isMain: true,
        },
      ],
    },
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      description: 'Premium noise-cancelling wireless headphones with 30-hour battery life.',
      price: '249.99',
      cost: '120.00',
      stock: 60,
      categoryId: accessories.id,
      images: [
        {
          url: '/uploads/products/2024/01/wireless-headphones.jpg',
          altText: 'Wireless Headphones',
          isMain: true,
        },
      ],
    },
    {
      name: 'Blue Cotton T-Shirt',
      slug: 'blue-cotton-tshirt',
      description: '100% organic cotton t-shirt, available in S, M, L, XL sizes.',
      price: '29.99',
      cost: '10.00',
      stock: 200,
      categoryId: mens.id,
      images: [
        {
          url: '/uploads/products/2024/01/blue-tshirt.jpg',
          altText: 'Blue Cotton T-Shirt',
          isMain: true,
        },
      ],
    },
    {
      name: 'Black Denim Jeans',
      slug: 'black-denim-jeans',
      description: 'Classic black denim jeans with stretch comfort fit.',
      price: '79.99',
      cost: '30.00',
      stock: 150,
      categoryId: mens.id,
      images: [
        {
          url: '/uploads/products/2024/01/black-jeans.jpg',
          altText: 'Black Denim Jeans',
          isMain: true,
        },
      ],
    },
    {
      name: 'Casual Sneakers',
      slug: 'casual-sneakers',
      description: 'Comfortable casual sneakers for everyday wear.',
      price: '89.99',
      cost: '40.00',
      stock: 120,
      categoryId: mens.id,
      images: [
        {
          url: '/uploads/products/2024/01/sneakers.jpg',
          altText: 'Casual Sneakers',
          isMain: true,
        },
      ],
    },
    {
      name: 'Summer Dress',
      slug: 'summer-dress',
      description: 'Lightweight summer dress, perfect for warm weather.',
      price: '59.99',
      cost: '20.00',
      stock: 100,
      categoryId: womens.id,
      images: [
        {
          url: '/uploads/products/2024/01/summer-dress.jpg',
          altText: 'Summer Dress',
          isMain: true,
        },
      ],
    },
    {
      name: 'Black Blazer',
      slug: 'black-blazer',
      description: 'Professional black blazer for work and formal occasions.',
      price: '149.99',
      cost: '60.00',
      stock: 50,
      categoryId: womens.id,
      images: [
        {
          url: '/uploads/products/2024/01/black-blazer.jpg',
          altText: 'Black Blazer',
          isMain: true,
        },
      ],
    },
    {
      name: 'Ankle Boots',
      slug: 'ankle-boots',
      description: 'Stylish ankle boots with comfortable heel.',
      price: '119.99',
      cost: '50.00',
      stock: 75,
      categoryId: womens.id,
      images: [
        {
          url: '/uploads/products/2024/01/ankle-boots.jpg',
          altText: 'Ankle Boots',
          isMain: true,
        },
      ],
    },
  ];

  const products = await Promise.all(
    productData.map(async (data) => {
      const { images, ...productInput } = data;
      return prisma.product.create({
        data: {
          ...productInput,
          images: {
            create: images,
          },
        },
        include: { images: true },
      });
    }),
  );

  console.log(`✅ Created ${products.length} products with images\n`);

  // Create Carts with Items
  console.log('🛒 Creating shopping carts...');
  const cart1 = await prisma.cart.create({
    data: {
      userId: users[0].id,
      items: {
        create: [
          {
            productId: products[2].id, // Wireless Mouse
            quantity: 1,
          },
          {
            productId: products[3].id, // Mechanical Keyboard
            quantity: 2,
          },
        ],
      },
    },
  });

  const cart2 = await prisma.cart.create({
    data: {
      userId: users[1].id,
      items: {
        create: [
          {
            productId: products[0].id, // MacBook Pro
            quantity: 1,
          },
          {
            productId: products[4].id, // USB-C Hub
            quantity: 3,
          },
        ],
      },
    },
  });

  const cart3 = await prisma.cart.create({
    data: {
      userId: users[2].id,
      items: {
        create: [
          {
            productId: products[6].id, // Blue T-Shirt
            quantity: 2,
          },
        ],
      },
    },
  });

  // Other users get empty carts
  await prisma.cart.create({ data: { userId: users[3].id } });
  await prisma.cart.create({ data: { userId: users[4].id } });

  console.log('✅ Created 5 shopping carts\n');

  // Create Orders
  console.log('📦 Creating orders...');
  const orders = await Promise.all([
    // Completed order
    prisma.order.create({
      data: {
        orderNumber: 'ORD-20240101-001',
        userId: users[0].id,
        totalPrice: '179.97',
        status: 'DELIVERED',
        paymentStatus: 'SUCCEEDED',
        paymentIntentId: 'pi_test_001',
        paidAt: new Date('2024-01-01'),
        items: {
          create: [
            {
              productId: products[2].id,
              quantity: 1,
              price: '29.99',
            },
            {
              productId: products[3].id,
              quantity: 1,
              price: '149.99',
            },
          ],
        },
      },
    }),
    // Processing order
    prisma.order.create({
      data: {
        orderNumber: 'ORD-20240102-002',
        userId: users[1].id,
        totalPrice: '1999.99',
        status: 'PROCESSING',
        paymentStatus: 'SUCCEEDED',
        paymentIntentId: 'pi_test_002',
        paidAt: new Date('2024-01-02'),
        items: {
          create: [
            {
              productId: products[0].id,
              quantity: 1,
              price: '1999.99',
            },
          ],
        },
      },
    }),
    // Shipped order
    prisma.order.create({
      data: {
        orderNumber: 'ORD-20240103-003',
        userId: users[2].id,
        totalPrice: '59.98',
        status: 'SHIPPED',
        paymentStatus: 'SUCCEEDED',
        paymentIntentId: 'pi_test_003',
        paidAt: new Date('2024-01-03'),
        items: {
          create: [
            {
              productId: products[6].id,
              quantity: 2,
              price: '29.99',
            },
          ],
        },
      },
    }),
    // Pending order
    prisma.order.create({
      data: {
        orderNumber: 'ORD-20240104-004',
        userId: users[3].id,
        totalPrice: '279.98',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: [
            {
              productId: products[7].id,
              quantity: 1,
              price: '79.99',
            },
            {
              productId: products[8].id,
              quantity: 1,
              price: '89.99',
            },
          ],
        },
      },
    }),
    // Cancelled order
    prisma.order.create({
      data: {
        orderNumber: 'ORD-20240105-005',
        userId: users[4].id,
        totalPrice: '149.99',
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
        items: {
          create: [
            {
              productId: products[5].id,
              quantity: 1,
              price: '249.99',
            },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${orders.length} orders with various statuses\n`);

  // Summary
  console.log('📊 Seeding Summary:');
  console.log(`   ✅ Users: 1 Admin + ${users.length} Regular Users`);
  console.log(`   ✅ Categories: 6 (with parent-child relationships)`);
  console.log(`   ✅ Products: ${products.length} (with images)`);
  console.log(`   ✅ Shopping Carts: 5 (with items)`);
  console.log(`   ✅ Orders: ${orders.length} (with various statuses)\n`);

  console.log('🔐 Test Credentials:');
  console.log('   📧 Admin Email: admin@ecommerce.com');
  console.log('   🔑 Admin Password: Admin@123');
  console.log('   📧 User Email: john.doe@example.com');
  console.log('   🔑 User Password: User@123\n');

  console.log('✨ Database seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
