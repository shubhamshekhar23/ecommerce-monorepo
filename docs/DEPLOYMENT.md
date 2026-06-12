# Deployment Guide

This guide covers running and deploying the E-Commerce platform — both development and production.

---

## Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- Node.js 20+ (for local development outside Docker)
- A Stripe account (test keys for dev, live keys for prod)
- For production: a Linux server with a public IP and domain name

---

## Development Setup

### 1. Clone and install dependencies

```bash
git clone <repo>
cd ecommerce-monorepo
npm install
```

### 2. Create environment files

Each app has its own `.env`. Copy the examples:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/auth-service/.env.example apps/auth-service/.env
cp apps/gateway/.env.example apps/gateway/.env
cp apps/notification-service/.env.example apps/notification-service/.env
cp apps/search-service/.env.example apps/search-service/.env
```

Minimum required values for `apps/backend/.env`:

```env
# Database (PgBouncer pool in front of Postgres)
DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:6432/ecommerce_db?pgbouncer=true&connection_limit=1

# Direct connection for migrations (bypasses PgBouncer — required for advisory locks)
DIRECT_DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5434/ecommerce_db

NODE_ENV=development
PORT=4000

# Redis
REDIS_URL=redis://localhost:6379

# JWT (public key — tokens are signed by auth-service, verified here)
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# CORS (frontend origin)
CORS_ORIGIN=http://localhost:3000
```

Minimum for `apps/auth-service/.env`:

```env
DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5434/ecommerce_db
PORT=3006
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# RS256 key pair (generate once with: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem)
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3006/api/auth/google/callback
```

Minimum for `apps/gateway/.env`:

```env
PORT=3000
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
BACKEND_URL=http://localhost:4000
AUTH_SERVICE_URL=http://localhost:3006
SEARCH_SERVICE_URL=http://localhost:3005
```

### 3. Generate RSA key pair (one-time setup)

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Copy `private.pem` content into `JWT_PRIVATE_KEY` in auth-service `.env`.
Copy `public.pem` content into `JWT_PUBLIC_KEY` in backend, gateway, and search-service `.env`.

### 4. Start infrastructure services

```bash
cd apps/backend
docker compose up -d
```

This starts: Postgres (:5434), PgBouncer (:6432), Redis (:6379), RabbitMQ (:5672, :15672), Nginx (:80), Mailpit (:1025/:8025), Jaeger (:16686), Prometheus (:9090), Grafana (:3001), Loki (:3100), Promtail, pgAdmin (:5050), PgBouncer exporter (:9127).

Wait for Postgres to be ready:
```bash
docker compose logs -f postgres
# Wait for: "database system is ready to accept connections"
```

### 5. Run database migrations

```bash
cd apps/backend
npx prisma generate
npx prisma migrate deploy

cd ../auth-service
npx prisma generate
npx prisma migrate deploy
```

### 6. Start the applications

Each app runs independently. Open separate terminals or use a process manager:

```bash
# Terminal 1 — Backend monolith (port 4000)
cd apps/backend && npm run start:dev

# Terminal 2 — Auth Service (port 3006)
cd apps/auth-service && npm run start:dev

# Terminal 3 — Notification Service (port 3004)
cd apps/notification-service && npm run start:dev

# Terminal 4 — Search Service (port 3005)
cd apps/search-service && npm run start:dev

# Terminal 5 — Gateway (port 3000, the public entry point)
cd apps/gateway && node dist/main.js
# (build first: cd apps/gateway && npx nest build)
```

### 7. Verify everything is running

```bash
# Gateway health (pings all upstream services)
curl http://localhost:3000/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","firstName":"Test","lastName":"User"}'

# Swagger UI for backend API (bypasses gateway — use for direct testing)
open http://localhost:4000/api/docs
```

---

## Service URLs (Development)

- **API (via Gateway)**: http://localhost:3000
- **Backend Swagger**: http://localhost:4000/api/docs
- **Mailpit (email inbox)**: http://localhost:8025
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **Jaeger Tracing**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin) — metrics + logs (Loki datasource)
- **Loki**: http://localhost:3100 (API only, query via Grafana Explore)
- **pgAdmin**: http://localhost:5050

---

## Database Migrations

### Running migrations

Always use `DIRECT_DATABASE_URL` for migrations (bypasses PgBouncer — advisory locks are session-scoped):

```bash
cd apps/backend
npx prisma migrate deploy
```

In CI/CD this runs automatically before the deploy step.

### Before any migration in production

1. Take a database backup:
```bash
docker compose exec -T postgres pg_dump -U ecommerce_user ecommerce_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

2. Run the migration safety check (also runs in CI):
```bash
bash apps/backend/scripts/migration-safety-check.sh
```

This fails if the migration contains destructive operations that could break the currently-running code.

### Expand-Contract pattern (zero-downtime schema changes)

Never rename or drop a column in one step. The safe sequence:

1. **Expand** — add the new column as nullable; deploy code that writes to both columns
2. **Backfill** — migration populates the new column from old data
3. **Contract** — make the column required and drop the old column (separate deploy, after old column is no longer referenced)

This keeps old and new code working simultaneously during the rolling deploy window.

---

## Production Setup

### Environment differences from development

- `NODE_ENV=production`
- All `STRIPE_SECRET_KEY` values are live keys (`sk_live_...`), not test
- `JWT_PRIVATE_KEY` should be stored in a secrets manager (Docker Secrets, HashiCorp Vault), not in `.env` files
- `CORS_ORIGIN` whitelisted to production domain(s) only
- Redis and Postgres use strong passwords
- Nginx terminates TLS (certificates from Let's Encrypt or a CA)

### Docker image build

```bash
cd apps/backend
docker build -t ecommerce-api:latest .
docker tag ecommerce-api:latest ghcr.io/your-org/ecommerce-api:$(git rev-parse --short HEAD)
docker push ghcr.io/your-org/ecommerce-api:latest
```

Each commit gets an immutable SHA-tagged image (`sha-abc1234`) for rollback plus a floating branch tag (`main`).

### Zero-Downtime Blue-Green Deploy

The deploy script handles the cutover automatically:

```bash
bash apps/backend/scripts/blue-green-deploy.sh
```

What it does:
1. Pulls the new Docker image from the registry
2. Starts the "green" container
3. Waits for `GET /health` to return 200 on green (60s timeout)
4. Reloads Nginx upstream to point to green (zero-dropped-requests — Nginx finishes in-flight blue requests before cutting over)
5. Drains the blue container (waits for connection count to reach 0)
6. Stops blue

If green's health check never passes, the script aborts. Blue continues serving.

### CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs automatically on push:

- Push to `develop` → deploys to staging after passing tests
- Push to `main` → requires manual approval → deploys to production

Pipeline steps:
1. Lint + type check (parallel)
2. Migration safety check (parallel)
3. Tests against real Postgres + Redis (not mocks)
4. Docker build + push to registry
5. Blue-green deploy

---

## Monitoring

### Grafana Dashboards

Access at http://localhost:3001 (dev) or https://grafana.yourdomain.com (prod).

Add Prometheus datasource if not auto-configured:
- Datasource → New → Prometheus → URL: http://prometheus:9090

Four dashboard types to import from `grafana/dashboards/`:
- `red-dashboard.json` — Request Rate, Error Rate, Duration per endpoint
- `business-dashboard.json` — orders/hr, revenue/hr, conversion rate
- `database-dashboard.json` — query P95, pool utilisation
- `infra-dashboard.json` — CPU, memory, disk per container

### Alerting Rules

Configure in Grafana → Alerting:

- Error rate > 1% for 5 consecutive minutes
- P95 latency > 500ms
- PgBouncer pool > 90% saturated
- Payment failure spike (> 0.1 events/s)
- Disk space > 85%

---

## Backup & Restore

### Automated backup

```bash
# Daily at 2 AM (configured in crontab)
bash apps/backend/scripts/backup.sh

# Manually:
docker compose exec -T postgres pg_dump -U ecommerce_user ecommerce_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

Backups are retained for 30 days. Files older than 30 days are auto-deleted.

### Restore drill (run monthly)

```bash
# Create a test database
docker compose exec postgres createdb -U ecommerce_user ecommerce_db_test_restore

# Restore
gunzip -c backup_20260101_020000.sql.gz | docker compose exec -T postgres psql -U ecommerce_user ecommerce_db_test_restore

# Verify row counts match
docker compose exec postgres psql -U ecommerce_user ecommerce_db_test_restore -c "SELECT COUNT(*) FROM orders;"
```

**Important:** backups you have never successfully restored do not actually exist. Run the restore drill monthly.

---

## Scaling

### Horizontal app scaling

```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
```

Nginx load-balances across replicas. The app is stateless (no in-memory sessions — JWT only). PgBouncer pools connections from all replicas. BullMQ jobs are safe to process concurrently (jobs lock themselves via Redis).

### PgBouncer tuning

If connection pool becomes the bottleneck (watch `pgbouncer_pool_size` in Grafana):

```ini
# pgbouncer.ini
default_pool_size = 25    # increase from 20
max_client_conn = 1000    # total app-side connections accepted
```

### Separate Redis instances

Running BullMQ and caching on the same Redis instance is dangerous: `allkeys-lru` eviction can evict pending jobs. Run two Redis instances:

```yaml
redis-cache:
  image: redis:7-alpine
  command: redis-server --maxmemory-policy allkeys-lru --maxmemory 512mb

redis-queue:
  image: redis:7-alpine
  command: redis-server --maxmemory-policy noeviction
```

Update `REDIS_URL` (cache) and `REDIS_QUEUE_URL` (BullMQ) in `.env`.

---

## Security Checklist

- [ ] RSA private key not committed to git (check with `git log --all -S "BEGIN RSA"`)
- [ ] All `.env.*` files in `.gitignore`
- [ ] Stripe live keys in production (not test keys)
- [ ] Database password changed from default (`ecommerce_password`)
- [ ] Redis password set (`requirepass` in redis.conf)
- [ ] Nginx TLS configured (HTTPS only, HSTS header)
- [ ] Firewall: only ports 80 and 443 open externally; all service ports internal only
- [ ] RabbitMQ default credentials changed (not guest/guest)
- [ ] Grafana password changed from default
- [ ] Database backups tested (restore drill completed)
- [ ] CORS `CORS_ORIGIN` set to production domain(s) only
- [ ] `NODE_ENV=production` (disables Swagger UI, enables prod logging)
