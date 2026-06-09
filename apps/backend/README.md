# E-Commerce Backend — NestJS + PostgreSQL

A production-grade e-commerce backend built across 10 learning phases, covering
database design, reliability patterns, caching, event-driven architecture,
observability, security, and microservices.

---

## Tech Stack

- **Framework:** NestJS with TypeScript (strict mode)
- **Database:** PostgreSQL 16 with Prisma ORM
- **Cache:** Redis 7
- **Message broker:** RabbitMQ 3.12
- **Auth:** RS256 JWT (access + refresh tokens), TOTP 2FA, OAuth
- **Payments:** Stripe
- **Search:** PostgreSQL FTS (built-in) + OpenSearch (microservice)
- **Observability:** Pino logging, Prometheus metrics, Grafana dashboards, Jaeger tracing, Loki log aggregation
- **Containerisation:** Docker + Docker Compose

---

## Prerequisites

- Docker Desktop
- Node.js v20+ and npm v10+ (for local editor tooling only — the app runs in Docker)

---

## Getting Started

### 1. Environment

```bash
cp apps/backend/.env.example apps/backend/.env
# Fill in JWT_PRIVATE_KEY and JWT_PUBLIC_KEY (see docs/TROUBLESHOOTING.md #6)
```

### 2. Start everything

```bash
# From the monorepo root
docker compose up -d
```

This starts: PostgreSQL, PgBouncer, Redis, RabbitMQ, OpenSearch, Mailpit,
Jaeger, Prometheus, Grafana, Loki, Promtail, the NestJS backend, Auth Service,
Search Service, Notification Service, and the Gateway.

### 3. Run migrations

```bash
docker compose exec backend npx prisma migrate deploy
```

### 4. Seed the database (optional)

```bash
# Minimal seed (~10 records per table)
docker compose exec backend npm run prisma:seed

# Extensive seed (realistic volumes with faker.js)
docker compose exec backend npm run prisma:seed:extensive
```

### 5. Access the services

- **API (via gateway)** — http://localhost:3000
- **Swagger UI (backend direct)** — http://localhost:4000/api/docs
- **Grafana** — http://localhost:3001 (admin / admin)
- **RabbitMQ management** — http://localhost:15672 (guest / guest)
- **Mailpit (email inbox)** — http://localhost:8025
- **Jaeger tracing** — http://localhost:16686
- **PgAdmin** — http://localhost:5050 (admin@ecommerce.com / admin)
- **Prometheus** — http://localhost:9090

---

## Ports

- **:3000** — Gateway (public entry point, routes to all services)
- **:4000** — Backend (internal; hit directly for debugging or Swagger)
- **:3006** — Auth Service
- **:3005** — Search Service
- **:3004** — Notification Service
- **:5434** — PostgreSQL (direct, for migrations and Prisma Studio)
- **:6432** — PgBouncer (connection pooler — what the app connects to)
- **:6379** — Redis
- **:5672** — RabbitMQ AMQP

---

## Available Scripts

Run these inside the container (`docker compose exec backend <cmd>`) or locally
if you have Node installed:

```bash
npm run start:dev          # Dev server with hot reload (already running in Docker)
npm run build              # Production build
npm run type-check         # TypeScript check without building
npm run lint               # ESLint with auto-fix
npm run format             # Prettier
npm run test               # Unit tests
npm run test:cov           # Unit tests with coverage
npm run test:e2e           # End-to-end tests
npm run prisma:generate    # Regenerate Prisma client
npm run prisma:migrate     # Run pending migrations
npm run prisma:studio      # Prisma Studio (DB browser) on :5555
npm run prisma:seed        # Minimal seed
npm run prisma:seed:extensive  # Full faker.js seed
```

---

## Project Structure

```
apps/backend/
├── prisma/
│   ├── schema.prisma          # Single source of truth for the DB schema
│   ├── migrations/            # Migration history (SQL files)
│   └── seeds/                 # Modular seed files per domain
├── src/
│   ├── common/                # Guards, interceptors, pipes, decorators, utils
│   ├── config/                # Env validation and typed config
│   └── modules/
│       ├── auth/              # JWT, OAuth, TOTP 2FA, password reset
│       ├── users/
│       ├── products/          # Products, variants, FTS, CSV import
│       ├── categories/
│       ├── cart/
│       ├── orders/            # Saga, CQRS read model, outbox
│       ├── stripe/            # Payment intents, webhooks
│       ├── returns/
│       ├── coupons/
│       ├── invoices/
│       ├── reviews/
│       ├── upload/            # S3-compatible file upload
│       ├── mail/
│       ├── cache/             # Redis wrapper
│       ├── metrics/           # Prometheus business metrics
│       ├── audit/             # Append-only audit log
│       ├── db-analytics/      # Slow queries, partitions, replication lag
│       └── prisma/            # PrismaService (singleton)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DOCKER_WORKFLOW.md     # What to run when files change in Docker
│   ├── TROUBLESHOOTING.md
│   └── features/             # Per-phase deep-dives
└── test/
    ├── integration/
    ├── e2e/
    └── load/                  # Artillery load tests (see docs/features/phase-5-observability.md)
```

---

## Docker Workflow

When you change certain files, you need to take explicit action because the
container's `node_modules` is a named Docker volume, separate from the host.

**Source files (`.ts`)** — nothing, hot reload handles it.

**`schema.prisma`** — run inside the container:
```bash
docker compose exec backend npx prisma migrate dev --name your_change
```

**`package.json`** — rebuild the image:
```bash
docker compose build backend && docker compose up -d backend
```

**`Dockerfile` or `docker-compose.yml`** — rebuild and recreate:
```bash
docker compose build backend && docker compose up -d backend
```

See [docs/DOCKER_WORKFLOW.md](docs/DOCKER_WORKFLOW.md) for the full breakdown.

---

## Phase Roadmap

- **Phase 0** — Infrastructure: Docker, PgBouncer, Redis, RabbitMQ ✅
- **Phase 1** — Database: variants schema, FTS, pessimistic locking, expand-contract migrations ✅
- **Phase 2** — Reliability: circuit breaker, outbox pattern, idempotency, order saga ✅
- **Phase 3** — Caching: Redis, cache-aside, invalidation, CQRS read model ✅
- **Phase 4** — Event-driven: RabbitMQ, OpenSearch sync, notifications ✅
- **Phase 5** — Observability: Pino, Prometheus, Grafana, Jaeger tracing, Loki ✅
- **Phase 6** — Security: TOTP 2FA, OAuth, rate limiting, append-only audit log ✅
- **Phase 7** — Features: coupons, returns, invoices, CSV import, reviews ✅
- **Phase 8** — CI/CD 🔲
- **Phase 9** — Microservices: Gateway, Auth Service, Search Service 🔲
- **Phase 10** — Advanced DB: table partitioning, read replica, pg_stat_statements ✅

See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed phase notes.

---

## Coding Standards

See [CLAUDE.md](./CLAUDE.md) — enforced via ESLint, Prettier, and pre-commit hooks.

Key rules: 200 lines per file, 20 lines per function, no `any`, no `unknown` on
public service methods.

---

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

Common fixes:
- DB connection refused → `docker compose up -d postgres pgbouncer`
- Prisma type errors after schema change → `docker compose exec backend npx prisma generate && docker compose restart backend`
- JWT errors → check RS256 key pair setup in TROUBLESHOOTING.md #6

---

**Last Updated:** June 2026
