# E-Commerce Backend - NestJS + PostgreSQL

A production-ready e-commerce backend application built with NestJS, PostgreSQL, and Prisma.

## Project Overview

This is a comprehensive e-commerce backend system that includes:

- RESTful API with Swagger documentation
- JWT authentication with refresh tokens
- PostgreSQL database with Prisma ORM
- Docker containerization
- Comprehensive logging and monitoring
- Extensive testing (unit, integration, E2E, load tests)

## Tech Stack

- **Framework:** NestJS with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with refresh tokens
- **API:** REST with Swagger/OpenAPI
- **Containerization:** Docker + Docker Compose
- **Linting:** ESLint
- **Formatting:** Prettier
- **Testing:** Jest, Supertest
- **Logging:** Pino (structured logging)

## Prerequisites

- Node.js v20+
- npm v10+
- Docker & Docker Compose
- PostgreSQL 16+ (or use Docker Compose)

## Getting Started

### 1. Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate
```

### 2. Environment Setup

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

### 3. Database Setup

**Option A: Using Docker Compose (Recommended)**

```bash
# Start all services (PostgreSQL, Redis, PgAdmin, NestJS app)
docker-compose up

# In another terminal, run migrations
docker-compose exec app npm run prisma:migrate
```

**Option B: Local PostgreSQL**

```bash
# Update DATABASE_URL in .env to your PostgreSQL connection

# Run migrations
npm run prisma:migrate
```

### 4. Start Development Server

```bash
npm run start:dev
```

The application will be available at `http://localhost:3000`
API documentation: `http://localhost:3000/api/docs`

## Available Scripts

```bash
# Development
npm run start:dev        # Start with hot reload
npm run start:debug      # Start with debugger

# Production
npm run build            # Build for production
npm run start:prod       # Start production build

# Linting & Formatting
npm run lint             # Run ESLint with fixes
npm run lint:check       # Check without fixing
npm run format           # Format with Prettier
npm run format:check     # Check without formatting

# Type Checking
npm run type-check       # Check TypeScript without building

# Testing
npm run test             # Run unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests
npm run test:debug       # Debug tests

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio (database GUI)
```

## Project Structure

```
src/
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators (@Public, @Roles, etc.)
│   ├── filters/         # Exception filters
│   ├── guards/          # Authorization guards
│   ├── interceptors/    # Request/response interceptors
│   ├── exceptions/      # Custom exceptions
│   ├── pipes/           # Validation pipes
│   ├── types/           # Shared types
│   └── utils/           # Utility functions
├── config/              # Configuration modules
├── modules/             # Feature modules (auth, users, products, etc.)
├── app.module.ts        # Root module
├── app.controller.ts    # Root controller
├── app.service.ts       # Root service
└── main.ts              # Application entry point

prisma/
├── schema.prisma        # Database schema
└── migrations/          # Database migrations

test/
├── integration/         # Integration tests
├── e2e/                 # End-to-end tests
└── load/                # Load/performance tests
```

## Coding Standards

See [claude.md](./claude.md) for comprehensive coding standards including:

- File & function size limits
- Naming conventions
- Code organization
- TypeScript best practices
- NestJS patterns
- Security guidelines
- Performance optimization
- Testing standards

### Quick References

**File Size Limits:**

- Max 200 lines per file
- Max 20 lines per function
- Max 5 parameters per function

**Naming:**

- Classes: PascalCase (`UserService`)
- Functions: camelCase (`getUserById`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- Files: kebab-case (`user.service.ts`)

**Pre-commit Hooks:**
The project uses Husky for pre-commit hooks that automatically:

- Run ESLint
- Check Prettier formatting
- Type check with TypeScript

## Docker Compose Services

- **PostgreSQL** (Port 5432) - Main database
- **Redis** (Port 6379) - Caching & sessions
- **PgAdmin** (Port 5050) - Database management GUI (admin@ecommerce.local / admin)
- **NestJS App** (Port 3000) - Application server

## Database (Prisma)

### Current Models

- **User** - User accounts with roles (USER, ADMIN, VENDOR)
- **RefreshToken** - JWT refresh token management

### Run Migrations

```bash
# Create new migration
npm run prisma:migrate

# View database in Prisma Studio
npm run prisma:studio
```

## API Documentation

Swagger/OpenAPI documentation is available at `/api/docs` when running the application.

## Testing

```bash
# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode for development
npm run test:watch
```

## Phase Breakdown

The project is organized into 8 implementation phases:

1. **Phase 1** - Foundation ✓ (Current)
2. **Phase 2** - Authentication & Authorization
3. **Phase 3** - Core E-Commerce Features
4. **Phase 4** - Payment Integration (Stripe)
5. **Phase 5** - Email & File Upload
6. **Phase 6** - Monitoring & Observability
7. **Phase 7** - Testing & Quality Assurance
8. **Phase 8** - Documentation & Deployment

See [Plan](/.claude/plans/sparkling-floating-lecun.md) for detailed phase information.

## Contributing

Please follow the coding standards in [claude.md](./claude.md) for all contributions.

## License

UNLICENSED - Private project

## Support

For questions or issues, please contact the development team.

---

**Last Updated:** February 5, 2026
**Phase:** Phase 1 - Foundation Complete
