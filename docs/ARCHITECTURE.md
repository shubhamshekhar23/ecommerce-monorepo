# Architecture Overview

This document describes the architecture and design of the E-Commerce Backend application.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [API Design](#api-design)
- [Caching Strategy](#caching-strategy)
- [Error Handling](#error-handling)
- [Deployment Architecture](#deployment-architecture)

## System Overview

The E-Commerce Backend is a production-ready REST API built with NestJS, PostgreSQL, and Stripe integration. It provides complete e-commerce functionality including user management, products, shopping cart, orders, and payments.

### Key Features

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Products**: Catalog with categories, search, and filtering
- **Cart**: Shopping cart with persistent storage
- **Orders**: Order management and history
- **Payments**: Stripe integration with webhook handling
- **Email**: Transactional email notifications
- **Files**: File upload and storage
- **Monitoring**: Structured logging, health checks, metrics

## Technology Stack

```
┌─────────────────────────────────────────────┐
│          Application Layer (NestJS)         │
│  Controllers • Services • Guards • Filters  │
└────────────────────┬────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼──┐    ┌───▼─┐    ┌────▼──┐
   │Database│   │Cache│    │ Queue │
   │PgSQL   │   │Redis│    │  Bull │
   │Prisma  │   │     │    │       │
   └────────┘   └─────┘    └───────┘
        │            │
        └────────────┼────────────┐
                     │            │
            ┌────────▼┐    ┌──────▼────┐
            │Monitoring     │ External  │
            │Prometheus    │  Services │
            │Grafana       │ Stripe,S3 │
            │Logs          │ SMTP      │
            └───────────────────────────┘
```

### Core Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | NestJS 10 | Web framework |
| Language | TypeScript | Type safety |
| Database | PostgreSQL 16 | Relational data |
| ORM | Prisma | Database access |
| Cache | Redis 7 | Session, rate limiting |
| Authentication | Passport.js | JWT strategies |
| API Docs | Swagger/OpenAPI | Interactive docs |
| Logging | Pino | Structured logging |
| Monitoring | Prometheus/Grafana | Metrics & dashboards |
| Container | Docker | Application packaging |
| Orchestration | Docker Compose | Local development |

## Project Structure

```
ecommerce-backend/
├── src/
│   ├── common/
│   │   ├── decorators/      # Custom decorators (@Public, @Roles, @CurrentUser)
│   │   ├── filters/         # Exception filters (HttpExceptionFilter)
│   │   ├── guards/          # Authentication/Authorization guards
│   │   ├── middleware/      # HTTP middleware
│   │   ├── pipes/           # Validation pipes
│   │   ├── utils/           # Utility functions (password hashing, etc.)
│   │   └── types/           # TypeScript interfaces/types
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── env.validation.ts
│   │
│   ├── modules/             # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/  # JWT strategies
│   │   │   ├── dto/         # Data Transfer Objects
│   │   │   └── auth.service.spec.ts
│   │   │
│   │   ├── users/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── stripe/
│   │   ├── mail/
│   │   ├── upload/
│   │   ├── health/
│   │   ├── metrics/
│   │   └── prisma/
│   │
│   ├── app.module.ts        # Root module
│   ├── app.controller.ts    # Root controller
│   └── main.ts              # Application entry point
│
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
│
├── test/
│   ├── jest-e2e.json       # E2E test config
│   └── app.e2e-spec.ts     # E2E tests
│
├── docs/
│   ├── DEPLOYMENT.md
│   ├── ARCHITECTURE.md
│   └── API.md
│
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI/CD
│
├── docker-compose.yml       # Development composition
├── docker-compose.prod.yml  # Production composition
├── Dockerfile              # Multi-stage build
├── nginx.conf              # Reverse proxy config
├── .env.example            # Environment template
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Core Components

### 1. Authentication Module

**Flow:**
```
User Request
    │
    ▼
JWT Guard (validates token)
    │
    ├─► Valid → Extract user → Pass to route
    │
    └─► Invalid → 401 Unauthorized
```

**Key Files:**
- `auth.controller.ts` - POST /auth/register, /auth/login, /auth/refresh
- `auth.service.ts` - JWT generation, validation, token storage
- `jwt.strategy.ts` - Token extraction and validation
- `jwt-auth.guard.ts` - Global authentication guard

**Token Strategy:**
- Access token: 15 minutes (short-lived)
- Refresh token: 7 days (long-lived)
- Stored in PostgreSQL for revocation support
- Support for multiple concurrent tokens per user

### 2. Database Layer (Prisma)

**Architecture:**
```
Application
    │
    ▼
NestJS Service
    │
    ▼
PrismaService
    │
    ▼
PostgreSQL Database
```

**Database Features:**
- Type-safe database queries
- Automatic migrations
- Connection pooling
- Transaction support for complex operations

**Key Models:**
- User, RefreshToken (authentication)
- Product, Category, ProductImage (catalog)
- Cart, CartItem (shopping)
- Order, OrderItem, Address (orders)
- Payment (payment tracking)

### 3. API Layer (Controllers)

**Pattern:** REST with resource-based URLs

```
POST   /api/auth/register              # Create account
POST   /api/auth/login                 # Authenticate
POST   /api/auth/refresh               # Refresh tokens
POST   /api/auth/logout                # Revoke tokens

GET    /api/users/me                   # Current user profile
PATCH  /api/users/me                   # Update profile

GET    /api/products                   # List products (with filters)
GET    /api/products/:id               # Get product details
POST   /api/products                   # Create (Admin only)
PATCH  /api/products/:id               # Update (Admin only)
DELETE /api/products/:id               # Delete (Admin only)

GET    /api/cart                       # Get cart
POST   /api/cart/items                 # Add to cart
PATCH  /api/cart/items/:id             # Update quantity
DELETE /api/cart/items/:id             # Remove item
DELETE /api/cart                       # Clear cart

POST   /api/orders                     # Create order
GET    /api/orders                     # List user orders
GET    /api/orders/:id                 # Get order details
PATCH  /api/orders/:id/cancel          # Cancel order

POST   /api/stripe/create-payment-intent     # Create payment intent
POST   /api/stripe/webhook              # Stripe webhooks

POST   /api/upload/single               # Upload single file
POST   /api/upload/products             # Upload multiple files
DELETE /api/upload/:filepath            # Delete file

GET    /health                          # Health check
GET    /api/health/ready                # Readiness probe
GET    /api/health/live                 # Liveness probe
GET    /api/metrics                     # Prometheus metrics
```

### 4. Service Layer

Each module has a service containing business logic:

**Pattern:**
```typescript
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    // Business logic
  }

  async findAll(filters: ProductFilters): Promise<Product[]> {
    // Complex queries, filtering, pagination
  }
}
```

**Responsibilities:**
- Database operations
- Business rule validation
- Error handling
- Service-to-service communication

### 5. Guards & Decorators

**Authentication Guard:**
```typescript
@UseGuards(JwtAuthGuard)
@Get('/protected')
protectedRoute() { }

@Public()  // Bypass auth
@Get('/public')
publicRoute() { }
```

**Authorization Guard:**
```typescript
@Roles(UserRole.ADMIN)
@Delete('/:id')
deleteProduct() { }
```

**Current User Decorator:**
```typescript
@Get('/me')
getProfile(@CurrentUser() user: User) { }
```

## Data Flow

### Complete Order Flow

```
1. User Registration
   Register → Hash password → Store in DB → Return tokens

2. Browse Products
   GET /products?category=electronics&priceMax=1000
   → Filter & paginate → Return ProductResponseDtos

3. Add to Cart
   POST /cart/items { productId, quantity }
   → Get or create cart → Validate stock → Add item
   → Calculate total → Return CartResponseDto

4. Checkout
   POST /orders { cartId, shippingAddress }
   → Create order from cart items → Create payment intent
   → Reserve stock → Return order with payment details

5. Payment Processing
   Frontend: Submit payment with client_secret to Stripe
   → Stripe: Process payment
   → Webhook: POST /stripe/webhook
   → Backend: Update order status to PAID
   → Email: Send order confirmation
   → Return: 200 OK

6. Order Management
   GET /orders/:id
   → Fetch order with items
   → Fetch payment status
   → Return OrderResponseDto
```

## Database Schema

### Core Tables

```sql
-- Users
User {
  id UUID PRIMARY KEY
  email String UNIQUE
  password String (hashed)
  firstName String
  lastName String
  role UserRole (USER, ADMIN)
  isActive Boolean
  createdAt DateTime
  updatedAt DateTime
}

-- Authentication Tokens
RefreshToken {
  id UUID PRIMARY KEY
  userId UUID (FK)
  token String UNIQUE
  isRevoked Boolean
  expiresAt DateTime
  createdAt DateTime
}

-- Products Catalog
Category {
  id UUID PRIMARY KEY
  name String UNIQUE
  slug String UNIQUE
  description String
  parentId UUID (self-relation, nullable)
  isActive Boolean
  createdAt DateTime
  updatedAt DateTime
}

Product {
  id UUID PRIMARY KEY
  name String
  slug String
  description String
  price Decimal(10,2)
  compareAtPrice Decimal(10,2)
  categoryId UUID (FK)
  sku String UNIQUE
  stockQuantity Int
  isActive Boolean
  createdAt DateTime
  updatedAt DateTime
}

-- Shopping Cart
Cart {
  id UUID PRIMARY KEY
  userId UUID (FK)
  createdAt DateTime
  updatedAt DateTime
}

CartItem {
  id UUID PRIMARY KEY
  cartId UUID (FK)
  productId UUID (FK)
  quantity Int
  price Decimal(10,2)
  createdAt DateTime
  updatedAt DateTime
}

-- Orders
Order {
  id UUID PRIMARY KEY
  userId UUID (FK)
  orderNumber String UNIQUE
  status OrderStatus (PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
  subtotal Decimal(10,2)
  tax Decimal(10,2)
  shipping Decimal(10,2)
  total Decimal(10,2)
  paymentIntentId String (unique)
  paymentStatus PaymentStatus
  paidAt DateTime (nullable)
  shippingAddressId UUID (FK)
  billingAddressId UUID (FK)
  createdAt DateTime
  updatedAt DateTime
}

OrderItem {
  id UUID PRIMARY KEY
  orderId UUID (FK)
  productId UUID (FK)
  quantity Int
  price Decimal(10,2)
  productSnapshot JSON
  createdAt DateTime
}

-- Shipping Addresses
Address {
  id UUID PRIMARY KEY
  userId UUID (FK)
  type AddressType (SHIPPING, BILLING)
  firstName String
  lastName String
  addressLine1 String
  addressLine2 String (nullable)
  city String
  state String
  postalCode String
  country String
  phone String
  isDefault Boolean
  createdAt DateTime
  updatedAt DateTime
}
```

## Authentication & Authorization

### JWT Implementation

**Access Token (15 minutes):**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "user",
  "type": "access",
  "iat": 1704067200,
  "exp": 1704068100
}
```

**Refresh Token (7 days):**
```json
{
  "sub": "user-id",
  "type": "refresh",
  "iat": 1704067200,
  "exp": 1704672000
}
```

### Token Rotation

```
1. Client: POST /auth/refresh { refreshToken }
2. Server: Validate refresh token signature & DB status
3. Server: Generate new access & refresh tokens
4. Server: Revoke old refresh token (isRevoked = true)
5. Server: Return new token pair
6. Client: Store new tokens
```

### Role-Based Access Control

```typescript
enum UserRole {
  USER = 'user',      // Normal customer
  ADMIN = 'admin',    // Full system access
}

// Usage
@Roles(UserRole.ADMIN)
@Delete('/:id')
deleteProduct(@Param('id') id: string) { }
```

## API Design

### Response Format

**Success Response:**
```json
{
  "data": { /* ... */ },
  "statusCode": 200,
  "message": "Success"
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "BadRequest",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Pagination

```typescript
GET /api/products?page=1&limit=20&sort=price:asc

{
  "data": [ /* 20 items */ ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### Filtering

```typescript
GET /api/products?category=electronics&minPrice=100&maxPrice=1000&search=laptop

// Implemented in service layer
// Generates efficient SQL with proper indexes
```

## Caching Strategy

### Redis Caching Layers

1. **Session Caching**: User sessions, active tokens
2. **Data Caching**: Product lists, categories (TTL: 1 hour)
3. **Rate Limiting**: Request count per IP (TTL: 1 minute)
4. **Temporary Data**: Cart (TTL: 24 hours)

### Cache Invalidation

- **Time-based**: Automatic expiry (TTL)
- **Event-based**: Invalidate on updates
  - Product updated → Invalidate product cache
  - Category updated → Invalidate category cache

## Error Handling

### Exception Hierarchy

```
HttpException
├── BadRequestException (400)
├── UnauthorizedException (401)
├── ForbiddenException (403)
├── NotFoundException (404)
├── ConflictException (409)
└── InternalServerErrorException (500)
```

### Global Exception Filter

All exceptions are caught and formatted by `HttpExceptionFilter`:

```json
{
  "statusCode": 400,
  "message": "Invalid email format",
  "error": "BadRequest",
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/api/users"
}
```

## Deployment Architecture

### Development

```
Developer Machine
  ├── NestJS app (npm run start:dev)
  ├── PostgreSQL (Docker)
  ├── Redis (Docker)
  └── Swagger UI (http://localhost:3000/api/docs)
```

### Production

```
Internet
  │
  ▼
Load Balancer / DNS
  │
  ▼
Docker Swarm / Kubernetes
  ├── App (×2-3 replicas)
  ├── PostgreSQL (×1, with backups)
  ├── Redis (×1, with replication)
  ├── Prometheus (monitoring)
  └── Grafana (dashboards)

Reverse Proxy (Nginx)
  ├── SSL/TLS termination
  ├── Rate limiting
  ├── Load balancing
  └── Static file serving
```

### High Availability

- **Database**: Master-replica setup, automated backups
- **Cache**: Redis with replication
- **App Servers**: Multiple replicas with health checks
- **Health Checks**: Liveness and readiness probes
- **Monitoring**: Real-time alerts and dashboards

## Security Layers

1. **Network**: Firewall, VPC, rate limiting
2. **Transport**: HTTPS/TLS, HSTS headers
3. **Authentication**: JWT with short expiry
4. **Authorization**: Role-based access control
5. **Input Validation**: DTO validation, sanitization
6. **Data**: Encrypted at rest (optional), in transit
7. **Monitoring**: Structured logs, audit trails

## Scalability Considerations

- **Stateless Design**: No server-side sessions (JWT)
- **Database Scaling**: Connection pooling, read replicas
- **Caching**: Redis for hot data
- **Horizontal Scaling**: Docker-based deployment
- **Asynchronous Jobs**: Background processing (Bull)
- **CDN**: Static assets and uploads (CloudFront/S3)

---

For more details, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [README.md](../README.md) - Project overview
- [API.md](./API.md) - API endpoints documentation
