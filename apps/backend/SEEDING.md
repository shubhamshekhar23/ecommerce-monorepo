# Database Seeding Guide

This guide explains how to populate your database with sample data for development and testing.

## Overview

The project includes a Prisma seed script (`prisma/seed.ts`) that initializes your database with realistic sample data including:

- **6 Users:** 1 admin + 5 regular users
- **6 Categories:** Electronics (computers, accessories) and Fashion (men's, women's clothing)
- **12 Products:** Laptops, accessories, clothing with images
- **5 Shopping Carts:** With various items
- **5 Orders:** With different statuses (pending, processing, shipped, delivered, cancelled)

## Prerequisites

1. Node.js 20+ installed
2. npm dependencies installed: `npm install`
3. PostgreSQL running (local or Docker)
4. Database created and `.env` configured with `DATABASE_URL`

## Quick Start

### Option 1: Automatic Seeding (Recommended)

After running migrations, automatically seed the database:

```bash
# Run migrations (creates tables)
npm run prisma:migrate

# The seed script runs automatically after migration
# OR run manually anytime:
npm run prisma:seed
```

### Option 2: Manual Seeding

If you already have tables created:

```bash
npm run prisma:seed
```

## Complete Setup Workflow

Here's the full workflow to set up your development environment:

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (if using Docker)
docker-compose up -d postgres redis

# 3. Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL if needed

# 4. Run migrations and seed
npm run prisma:migrate
# Migrations run, then seeding happens automatically

# 5. Verify data was seeded
npm run prisma:studio
# Opens Prisma Studio to view the data

# 6. Start the application
npm run start:dev
```

## Test Credentials

After seeding, use these credentials to test the application:

### Admin Account

```
Email: admin@ecommerce.com
Password: Admin@123
Role: ADMIN
```

### Regular User Account

```
Email: john.doe@example.com
Password: User@123
Role: USER

Other users:
- jane.smith@example.com (User@123)
- mike.johnson@example.com (User@123)
- sarah.williams@example.com (User@123)
- david.brown@example.com (User@123)
```

## Sample Data Details

### Categories Created

**Electronics** (parent)

- Computers (children: MacBook Pro, Dell XPS)
  - Computers
- Accessories (children: Mouse, Keyboard, Hub, Headphones)
  - Accessories

**Fashion** (parent)

- Men's Clothing (T-shirts, Jeans, Sneakers)
- Women's Clothing (Dresses, Blazers, Boots)

### Products with Stock Levels

| Product             | Price     | Stock | Category         |
| ------------------- | --------- | ----- | ---------------- |
| MacBook Pro 14"     | $1,999.99 | 25    | Computers        |
| Dell XPS 13         | $1,299.99 | 30    | Computers        |
| Wireless Mouse      | $29.99    | 150   | Accessories      |
| Mechanical Keyboard | $149.99   | 80    | Accessories      |
| USB-C Hub           | $49.99    | 200   | Accessories      |
| Wireless Headphones | $249.99   | 60    | Accessories      |
| Blue Cotton T-Shirt | $29.99    | 200   | Men's Clothing   |
| Black Denim Jeans   | $79.99    | 150   | Men's Clothing   |
| Casual Sneakers     | $89.99    | 120   | Men's Clothing   |
| Summer Dress        | $59.99    | 100   | Women's Clothing |
| Black Blazer        | $149.99   | 50    | Women's Clothing |
| Ankle Boots         | $119.99   | 75    | Women's Clothing |

### Sample Orders

5 orders are created with different statuses:

1. **ORD-20240101-001** - DELIVERED (Paid)
   - Items: Wireless Mouse (1), Mechanical Keyboard (1)
   - User: John Doe

2. **ORD-20240102-002** - PROCESSING (Paid)
   - Items: MacBook Pro (1)
   - User: Jane Smith

3. **ORD-20240103-003** - SHIPPED (Paid)
   - Items: Blue T-Shirt (2)
   - User: Mike Johnson

4. **ORD-20240104-004** - PENDING (Awaiting Payment)
   - Items: Jeans (1), Sneakers (1)
   - User: Sarah Williams

5. **ORD-20240105-005** - CANCELLED (Payment Failed)
   - Items: Wireless Headphones (1)
   - User: David Brown

### Shopping Carts

3 users have items in their carts:

1. **John Doe's Cart**
   - Wireless Mouse (qty: 1)
   - Mechanical Keyboard (qty: 2)

2. **Jane Smith's Cart**
   - MacBook Pro (qty: 1)
   - USB-C Hub (qty: 3)

3. **Mike Johnson's Cart**
   - Blue T-Shirt (qty: 2)

## API Testing Workflow

Once seeded, test the API:

```bash
# 1. Start the application
npm run start:dev

# 2. Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ecommerce.com","password":"Admin@123"}'

# 3. Get the access token from response
# 4. Use token for authenticated endpoints
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer <access_token>"

# 5. View Swagger documentation
# Open: http://localhost:3000/api/docs
```

## Database Inspection

View and manage data using Prisma Studio:

```bash
npm run prisma:studio
```

Opens an interactive UI at http://localhost:5555 where you can:

- View all tables and records
- Create/edit/delete data
- Query data with filters
- Export data

## Troubleshooting

### Error: "ENOENT: no such file or directory, open 'prisma/schema.prisma'"

**Solution:** Ensure you're in the project root directory:

```bash
cd /path/to/ecommerce-backend
npm run prisma:seed
```

### Error: "database error: database does not exist"

**Solution:** Ensure PostgreSQL is running and database exists:

```bash
# Check PostgreSQL status
docker-compose ps postgres

# Or create database manually if using local PostgreSQL
createdb ecommerce_db
```

### Error: "P1000: Authentication failed against database server"

**Solution:** Check DATABASE_URL in .env file:

```bash
# Verify correct format
DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5432/ecommerce_db

# If using Docker, use postgres service name:
DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@postgres:5432/ecommerce_db
```

### Seed script seems to hang

**Solution:** If script is taking too long, check:

```bash
# 1. Database connection
npm run prisma:studio

# 2. Check logs for errors
# The script should complete in < 5 seconds with healthy database
```

## Clearing and Reseeding

To clear all data and reseed (useful for development):

```bash
# Method 1: Using seed script
# The script automatically clears data before seeding
npm run prisma:seed

# Method 2: Full database reset
npx prisma migrate reset
# This runs all migrations and seeds the database
```

## Modifying Seed Data

To customize the sample data, edit `prisma/seed.ts`:

1. Open the file
2. Modify the `productData`, users, categories, etc.
3. Run seeding again:
   ```bash
   npm run prisma:seed
   ```

Key areas to customize:

```typescript
// Users (around line 35)
const users = await Promise.all([
  // Add/modify user data here
]);

// Products (around line 110)
const productData = [
  // Add/modify products here
];

// Orders (around line 220)
const orders = await Promise.all([
  // Add/modify orders here
]);
```

## Performance Notes

- Seeding typically completes in 2-5 seconds
- Creates proper indexes and relationships
- Uses bcrypt hashing for passwords (12 rounds)
- Includes realistic timestamps and data

## Development Tips

### Testing Authentication

```bash
# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","password":"User@123"}'

# Use token in subsequent requests
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <token>"
```

### Testing Admin Endpoints

```bash
# All admin endpoints require ADMIN role
# Use admin@ecommerce.com credentials for testing
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Product",...}'
```

### Testing Order Flow

```bash
# 1. Login as user
# 2. Get cart: GET /api/cart
# 3. Add items: POST /api/cart/items
# 4. Create order: POST /api/orders
# 5. Check status: GET /api/orders/:id
```

## Production Considerations

- **Do NOT use this seed data in production**
- Remove or disable the seed script for production builds
- Create separate seed scripts for different environments
- Use production-grade data generators for realistic testing

## Next Steps

After seeding:

1. ✅ Data is populated
2. ✅ Ready to test API endpoints
3. ✅ Can run integration/E2E tests
4. ✅ Ready for development
5. Use `npm run start:dev` to start development server
6. Use `npm run start:prod` for production builds

---

**Need help?** Check TROUBLESHOOTING.md for common issues.
