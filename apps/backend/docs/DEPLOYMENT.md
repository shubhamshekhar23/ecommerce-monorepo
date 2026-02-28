# Deployment Guide

This guide covers deploying the E-Commerce Backend application to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Migrations](#database-migrations)
- [Docker Deployment](#docker-deployment)
- [Nginx Configuration](#nginx-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Monitoring Setup](#monitoring-setup)
- [Scaling](#scaling)
- [Backup Strategy](#backup-strategy)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for local development/CI)
- PostgreSQL 16+ (if using external database)
- Redis 7+ (if using external cache)

### Infrastructure Requirements

- Linux server (Ubuntu 20.04 LTS or similar)
- Minimum 4GB RAM
- Minimum 20GB disk space
- Public IP address with reverse DNS configured
- Domain name with DNS configured

### Credentials & Secrets

- Stripe API keys (test and live)
- SMTP server credentials
- AWS S3 credentials (if using)
- SSL certificates (self-signed or from CA)
- Database backup encryption keys

## Environment Setup

### 1. Create Production .env File

```bash
cp .env.example .env.production
```

Edit `.env.production` and set production values:

```env
# Database
DATABASE_URL=postgresql://prod_user:strong_password@postgres:5432/ecommerce_prod

# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api
LOG_LEVEL=info

# JWT Secrets (use `openssl rand -base64 32` to generate)
JWT_SECRET=your_32_char_secret_key_here
JWT_REFRESH_SECRET=your_32_char_refresh_secret_here
REDIS_PASSWORD=your_redis_password

# Stripe (use live keys in production)
STRIPE_SECRET_KEY=sk_live_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...

# Email
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASSWORD=smtp_password
SMTP_FROM=noreply@example.com

# CORS
CORS_ORIGIN=https://example.com,https://www.example.com

# AWS S3 (optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=ecommerce-prod

# Grafana
GRAFANA_PASSWORD=strong_grafana_password
```

### 2. Secure Secret Management

Never commit `.env.production` to version control. Use one of:

**Option A: Docker Secrets (Swarm)**

```bash
echo "sk_live_xxx..." | docker secret create stripe_key -
```

**Option B: Environment Variables**

```bash
export STRIPE_SECRET_KEY="sk_live_xxx..."
export JWT_SECRET="..."
```

**Option C: Secrets Manager (AWS Secrets Manager, HashiCorp Vault)**
Integrate with your deployment tool to fetch secrets at runtime.

## Database Migrations

### 1. Initial Setup

```bash
# SSH into production server
ssh user@prod-server

# Navigate to application directory
cd /app

# Run Prisma migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### 2. Backup Before Migration

```bash
# Create database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U ecommerce_user -d ecommerce_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Rolling Back Migrations

```bash
# List migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate status

# Rollback to previous migration
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate resolve --rolled-back "migration_name"
```

## Docker Deployment

### 1. Build Docker Image

```bash
# Build locally
docker build -t ecommerce-api:latest .
docker tag ecommerce-api:latest ecommerce-api:1.0.0

# Or use Docker Compose to build
docker-compose -f docker-compose.prod.yml build
```

### 2. Push to Registry

```bash
# Login to registry
docker login ghcr.io

# Push image
docker push ghcr.io/your-org/ecommerce-api:latest
docker push ghcr.io/your-org/ecommerce-api:1.0.0
```

### 3. Deploy with Docker Compose

```bash
# Create data directories
mkdir -p ./volumes/postgres ./volumes/redis ./volumes/prometheus ./volumes/grafana

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### 4. Verify Deployment

```bash
# Check application health
curl https://api.example.com/health

# Check database connection
curl https://api.example.com/api/health/ready

# Access API documentation
open https://api.example.com/api/docs
```

## Nginx Configuration

### 1. Deploy Nginx

The `nginx.conf` is already configured in the repository. Key features:

- **HTTP to HTTPS Redirect**: All HTTP traffic redirected to HTTPS
- **Rate Limiting**: Auth endpoints limited to 5 req/min, API to 10 req/s
- **Security Headers**: HSTS, X-Frame-Options, CSP, etc.
- **Compression**: Gzip enabled for text/JSON responses
- **Caching**: Static assets cached for 1 year

### 2. Generate Self-Signed Certificate (Development)

```bash
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

### 3. Use CA Certificate (Production)

```bash
# Copy certificates to ssl directory
cp /path/to/cert.pem ./ssl/cert.pem
cp /path/to/key.pem ./ssl/key.pem

# Verify certificate
openssl x509 -in ssl/cert.pem -text -noout
```

### 4. Reload Nginx

```bash
# Reload configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Verify configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

## SSL/TLS Setup

### 1. Let's Encrypt with Certbot

```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Get certificate
certbot certonly --standalone -d api.example.com -d example.com

# Certificate location: /etc/letsencrypt/live/api.example.com/
# Copy to application: cp -r /etc/letsencrypt/live/api.example.com/ ./ssl/
```

### 2. Auto-Renewal

```bash
# Certbot handles auto-renewal automatically
# Verify renewal works
certbot renew --dry-run

# Check renewal timer
systemctl list-timers
```

### 3. Update docker-compose.prod.yml

```yaml
volumes:
  - /etc/letsencrypt/live/api.example.com/:/etc/nginx/ssl/:ro
```

## Monitoring Setup

### 1. Access Grafana

```bash
# Grafana runs at port 3001
# Default credentials: admin / (password from .env)
# Login: https://api.example.com:3001
```

### 2. Configure Data Source

- Datasource → New Data Source
- Select Prometheus
- URL: http://prometheus:9090
- Save & Test

### 3. Import Dashboards

- Dashboards → Import
- Upload JSON from `grafana/dashboards/api-metrics.json`

### 4. Setup Alerts

- Alerting → Alert rules
- Configure thresholds for:
  - High error rate (>5%)
  - Database connection failures
  - Memory usage (>80%)
  - Disk space (>85%)

## Scaling

### 1. Horizontal Scaling (Multiple App Instances)

Update `docker-compose.prod.yml`:

```yaml
services:
  app:
    deploy:
      replicas: 3 # Run 3 instances
```

### 2. Load Balancing

Nginx automatically load balances across instances using `least_conn` algorithm.

### 3. Database Connection Pooling

For multiple instances, use PgBouncer:

```yaml
pgbouncer:
  image: pgbouncer:latest
  environment:
    PGBOUNCER_DATABASES: ecommerce_db=host=postgres port=5432 user=ecommerce_user password=password
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 1000
    PGBOUNCER_DEFAULT_POOL_SIZE: 25
```

### 4. Redis Replication (Optional)

For high-availability Redis:

```yaml
redis-master:
  image: redis:7-alpine
  command: redis-server --requirepass password

redis-replica:
  image: redis:7-alpine
  command: redis-server --slaveof redis-master 6379 --requirepass password
```

## Backup Strategy

### 1. Automated Database Backups

```bash
# Create backup script: backup.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"

mkdir -p $BACKUP_DIR

docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
  -U ecommerce_user -d ecommerce_db | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Retain last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Schedule with cron
0 2 * * * /app/backup.sh  # Daily at 2 AM
```

### 2. Backup Redis Data

```bash
# Enable Redis persistence
redis-cli BGSAVE

# Backup RDB file
docker cp ecommerce_redis_prod:/data/dump.rdb ./backups/redis_$(date +%Y%m%d_%H%M%S).rdb
```

### 3. Restore from Backup

```bash
# Restore PostgreSQL
gunzip < backup_20240101_020000.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ecommerce_user -d ecommerce_db

# Restore Redis
docker cp redis_20240101_020000.rdb ecommerce_redis_prod:/data/dump.rdb
docker-compose -f docker-compose.prod.yml restart redis
```

### 4. Off-Site Backup

```bash
# Backup to S3
aws s3 cp /backups/postgres/db_latest.sql.gz s3://backup-bucket/ecommerce/

# Lifecycle policy: Archive after 30 days, delete after 90 days
```

## Rollback Procedures

### 1. Rollback Docker Image

```bash
# If deployment fails, revert to previous image version
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml down
git checkout previous-commit
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Database Rollback

```bash
# If migration failed, restore from backup
docker-compose -f docker-compose.prod.yml stop app
gunzip < backup_pre_migration.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U ecommerce_user -d ecommerce_db
docker-compose -f docker-compose.prod.yml start app
```

### 3. Zero-Downtime Deployment

```bash
# Use rolling update strategy
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale app=3
# Nginx automatically routes traffic only to healthy instances
```

## Troubleshooting

### Application not starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Verify environment variables
docker-compose -f docker-compose.prod.yml config | grep -E "JWT_|DATABASE"

# Check database connection
docker-compose -f docker-compose.prod.yml exec app npm run test:db
```

### High memory usage

```bash
# Check memory stats
docker stats

# Limit memory in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 512M
```

### Database connection errors

```bash
# Verify database is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check connection string
docker-compose -f docker-compose.prod.yml exec postgres psql -U ecommerce_user -d ecommerce_db -c "SELECT 1"

# Check PgBouncer if using connection pooling
docker-compose -f docker-compose.prod.yml logs pgbouncer
```

### SSL certificate issues

```bash
# Verify certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Check certificate dates
openssl x509 -in ssl/cert.pem -noout -dates

# Test SSL with curl
curl -v --cacert ssl/cert.pem https://api.example.com/health
```

### Webhook delivery failures

```bash
# Check Stripe webhook endpoint
stripe webhooks list

# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Test webhook delivery
stripe trigger payment_intent.succeeded
```

## Security Checklist

- [ ] All environment secrets set in production
- [ ] Database backups configured and tested
- [ ] SSL/TLS certificates installed and valid
- [ ] Firewall rules configured (only 80, 443 open)
- [ ] Database backups encrypted
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting configured
- [ ] Logging enabled and centralized
- [ ] Rate limiting configured
- [ ] CORS origins whitelisted
- [ ] Database password changed from default
- [ ] Redis password set to secure value
- [ ] SSH keys rotated
- [ ] Stripe keys are live keys, not test keys
- [ ] Email service credentials secured

## Support & Monitoring

### Monitoring URLs

- **API Docs**: https://api.example.com/api/docs
- **Health Check**: https://api.example.com/health
- **Metrics**: https://api.example.com/api/metrics
- **Prometheus**: https://prometheus.example.com:9090
- **Grafana**: https://grafana.example.com:3001

### Contact & Support

For deployment issues, contact the DevOps team or create an issue in the repository.
