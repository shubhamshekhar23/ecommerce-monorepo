# Troubleshooting Guide

This guide helps resolve common issues when running the E-Commerce Backend application.

## Common Issues & Solutions

### 1. npm or node Command Not Found

**Problem:**

```
command not found: npm
command not found: node
```

**Solution:**

First, verify Node.js installation:

```bash
# Check if Node.js is installed
node --version
npm --version

# If not found, install Node.js
# macOS (using Homebrew)
brew install node

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nodejs npm

# Or use nvm (Node Version Manager) - recommended
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**For shell PATH issues:**

```bash
# If npm is installed but not in PATH
# Add Node to your shell profile
# For bash (~/.bashrc or ~/.bash_profile)
export PATH="/usr/local/bin:$PATH"

# For zsh (~/.zshrc)
export PATH="/usr/local/bin:$PATH"

# Then reload your shell
source ~/.bashrc
# or
source ~/.zshrc
```

---

### 2. Module Not Found / Dependency Errors

**Problem:**

```
Error: Cannot find module '@nestjs/common'
```

**Solution:**

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or use clean install (recommended for production)
npm ci
```

---

### 3. ENOENT: Cannot Find Prisma Schema

**Problem:**

```
Error: ENOENT: no such file or directory, open 'prisma/schema.prisma'
```

**Solution:**

```bash
# Generate Prisma client
npx prisma generate

# Check schema exists
ls -la prisma/schema.prisma

# If schema doesn't exist, create it
# Use: git checkout prisma/schema.prisma
# Or restore from backup
```

---

### 4. Database Connection Failed

**Problem:**

```
Error: Can't reach database server at `localhost:5432`
```

**Solution:**

**Check PostgreSQL is running:**

```bash
# macOS
brew services list | grep postgres

# Ubuntu/Debian
sudo systemctl status postgresql

# Start if not running
# macOS
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql
```

**Using Docker (Recommended):**

```bash
# Start development containers
docker-compose up -d postgres redis

# Verify containers are running
docker-compose ps

# Check database is accessible
docker-compose exec postgres psql -U ecommerce_user -d ecommerce_db -c "SELECT 1"
```

**Check DATABASE_URL in .env:**

```bash
# Edit .env and ensure DATABASE_URL is correct
# Development (local)
DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5432/ecommerce_db

# Development (Docker)
DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@postgres:5432/ecommerce_db
```

---

### 5. .env File Not Found

**Problem:**

```
Error: Missing required environment variable: DATABASE_URL
```

**Solution:**

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
# or
vim .env
```

**Required environment variables:**

```env
DATABASE_URL=postgresql://user:password@host:5432/db
JWT_SECRET=your_32_char_secret_key_here
JWT_REFRESH_SECRET=your_32_char_refresh_secret_here
NODE_ENV=development
PORT=3000
```

---

### 6. TypeScript Compilation Errors

**Problem:**

```
error TS2304: Cannot find name 'RequestUser'
```

**Solution:**

```bash
# Generate Prisma types
npx prisma generate

# Type check
npm run type-check

# Fix type errors
# Check src/common/types/ exist and exports are correct
ls -la src/common/types/

# Rebuild TypeScript
npm run build
```

---

### 7. Nest Build Fails

**Problem:**

```
Error: Cannot find source file src/main.ts
```

**Solution:**

```bash
# Verify project structure
ls -la src/

# File should exist: src/main.ts
cat src/main.ts

# Check tsconfig.json is valid
cat tsconfig.json

# Clean and rebuild
rm -rf dist/
npm run build
```

---

### 8. Port Already in Use

**Problem:**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Find process using port 3000
lsof -i :3000
# or
netstat -tulpn | grep 3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:dev
```

---

### 9. Redis Connection Failed

**Problem:**

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**

**Check Redis is running:**

```bash
# macOS
brew services list | grep redis

# Ubuntu/Debian
sudo systemctl status redis-server

# Start if not running
# macOS
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis-server
```

**Using Docker:**

```bash
# Start Redis container
docker-compose up -d redis

# Verify
docker-compose exec redis redis-cli ping
# Should return: PONG
```

**Disable Redis (optional):**

```env
# Leave empty to disable caching
REDIS_URL=
```

---

### 10. Prisma Migration Issues

**Problem:**

```
Error: Migration failed
```

**Solution:**

```bash
# Check migration status
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name description

# Deploy existing migrations
npx prisma migrate deploy

# Rollback last migration
npx prisma migrate resolve --rolled-back "migration_name"
```

---

### 11. Start Script Doesn't Work

**Problem:**

```
npm run start:dev
# or
npm start
```

**Solution:**

```bash
# Check package.json scripts
cat package.json | grep -A 10 '"scripts"'

# Try running NestJS CLI directly
npx nest start --watch
# or
npx nest start

# Verify @nestjs/cli is installed
npm list @nestjs/cli

# If not installed
npm install --save-dev @nestjs/cli
```

---

### 12. Tests Not Running

**Problem:**

```
Error: Cannot find jest configuration
```

**Solution:**

```bash
# Run tests
npm run test

# Run with coverage
npm run test:cov

# Run specific test file
npm run test -- auth.service.spec.ts

# Run E2E tests
npm run test:e2e

# Check jest.config.js exists
ls -la jest.config.js
```

---

### 13. Linting Errors

**Problem:**

```
error  Unexpected any  @typescript-eslint/no-explicit-any
```

**Solution:**

```bash
# Run linter
npm run lint

# Check ESLint config
cat .eslintrc.js

# Fix auto-fixable issues
npm run lint -- --fix

# Check specific file
npm run lint -- src/modules/auth/auth.service.ts
```

---

### 14. Docker Compose Issues

**Problem:**

```
Error response from daemon: invalid mount config
```

**Solution:**

```bash
# Validate docker-compose syntax
docker-compose config

# Check volumes
docker-compose exec postgres ls -la /var/lib/postgresql/data

# View logs for specific service
docker-compose logs postgres
docker-compose logs redis
docker-compose logs app

# Rebuild containers
docker-compose down -v  # Remove volumes!
docker-compose build
docker-compose up -d

# Check resource limits
docker-compose exec app free -h  # Memory
docker-compose exec app df -h   # Disk
```

---

### 15. Health Check Failing

**Problem:**

```
HEALTHCHECK FAILED: failed to get response from 'http://localhost:3000/health'
```

**Solution:**

```bash
# Check if server is running
curl http://localhost:3000/health

# Check logs for errors
npm run start:dev  # Watch output

# Verify endpoint exists
# src/app.controller.ts should have @Get('/health')

# Check application started
# Look for "NestApplication successfully started" in logs

# Wait for application to fully initialize
# Startup can take 5-10 seconds with Prisma migrations
```

---

### 16. JWT Token Errors

**Problem:**

```
Error: JWT secret is not set
Error: Invalid token signature
```

**Solution:**

```bash
# Generate secure JWT secrets
openssl rand -base64 32

# Update .env
JWT_SECRET=<generated_value_32_chars>
JWT_REFRESH_SECRET=<generated_value_32_chars>

# Restart application
npm run start:dev

# Verify secrets are at least 32 characters
cat .env | grep JWT_SECRET | wc -c  # Should be > 32
```

---

### 17. CORS Errors

**Problem:**

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**

```env
# Update CORS_ORIGIN in .env
# For development
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# For production
CORS_ORIGIN=https://example.com,https://app.example.com
```

**Verify in code:**

```bash
# Check CORS configuration in src/main.ts
grep -A 5 "cors:" src/main.ts

# Check app.module.ts for ConfigModule
grep -A 10 "cors" src/app.module.ts
```

---

### 18. Swagger/OpenAPI Not Loading

**Problem:**

```
Cannot GET /api/docs
```

**Solution:**

```bash
# Check if Swagger is configured in main.ts
grep -A 10 "SwaggerModule" src/main.ts

# Verify @nestjs/swagger is installed
npm list @nestjs/swagger

# Access correct URL
# http://localhost:3000/api/docs

# Check route prefix
# If API_PREFIX=api, then /api/docs
# Otherwise check main.ts for prefix configuration
```

---

### 19. Memory Leaks / High Memory Usage

**Problem:**

```
JavaScript heap out of memory
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Solution:**

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm run start:dev

# Or edit package.json
"start:dev": "NODE_OPTIONS=--max-old-space-size=2048 nest start --watch"

# Check memory usage
npm run start:dev
# Monitor with: watch -n 1 'top -p <PID>'
```

---

### 20. Unable to Connect to Stripe

**Problem:**

```
Error: Missing API Key. Provide your API key as an argument to Stripe()
```

**Solution:**

```env
# Add Stripe keys to .env
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# For production use live keys
STRIPE_SECRET_KEY=sk_live_your_live_key_here
```

---

### 21. Pino Logger Transport Error

**Problem:**

```
ERROR [ExceptionHandler] unable to determine transport target for "pino-pretty"
Error: unable to determine transport target for "pino-pretty"
```

**Solution:**

This error occurs when the logger tries to use `pino-pretty` for pretty-printing logs but it's not installed. It's an optional development dependency.

**Option A: Install pino-pretty (Recommended for development)**

```bash
npm install --save-dev pino-pretty

# Then enable it in src/modules/logger/logger.module.ts:
# Uncomment the line with transport configuration
```

**Option B: Use without pino-pretty (Works fine as-is)**
The application works perfectly with JSON format logs (the default). No additional setup needed:

```bash
# Just run normally - logs will be in JSON format
npm run start:dev
```

**Log format comparison:**

With pino-pretty (pretty, human-readable):

```
  10:30:00 AM POST /api/auth/login 200 (12ms)
  User logged in successfully
```

Without pino-pretty (JSON, machine-readable, default):

```json
{ "level": 30, "time": "2024-01-15T10:30:00.000Z", "method": "POST", "msg": "User logged in" }
```

Both formats work equally well. JSON is actually preferred in production for log aggregation.

---

## Development Server Setup Checklist

- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Dependencies installed (`npm install`)
- [ ] .env file created (`cp .env.example .env`)
- [ ] PostgreSQL running (Docker or local)
- [ ] Redis running (Docker or local)
- [ ] Prisma schema exists (`ls prisma/schema.prisma`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Database migrations run (`npx prisma migrate dev`)
- [ ] JWT secrets configured (32+ characters)
- [ ] Database URL correct in .env
- [ ] All required env vars set (check .env.example)

---

## Getting Help

If issues persist:

1. **Check Documentation**
   - README.md - General setup
   - docs/ARCHITECTURE.md - System design
   - docs/DEPLOYMENT.md - Production setup

2. **Check Logs**
   - Application logs (stdout/stderr)
   - Database logs (`docker logs <container>`)
   - System logs (`journalctl -u service-name`)

3. **Debug Tips**
   - Add console.log() for debugging
   - Use VS Code debugger: `npm run start:debug`
   - Check database directly: `npx prisma studio`
   - Verify endpoints with curl: `curl http://localhost:3000/api/products`

4. **Report Issues**
   - GitHub Issues: https://github.com/your-org/ecommerce-backend/issues
   - Provide full error message and steps to reproduce
   - Include environment info (Node version, OS, Docker version)

---

## Performance Tips

```bash
# Run in production mode
npm run build
npm run start:prod

# Use load testing to identify bottlenecks
npm run load:mixed

# Monitor with Prometheus
open http://localhost:9090

# View dashboards with Grafana
open http://localhost:3001
```

---

**Last Updated**: January 2024
