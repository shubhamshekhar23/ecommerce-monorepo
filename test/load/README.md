# Load Testing Guide

This directory contains load testing scenarios for the e-commerce backend API using Artillery.

## Overview

Load testing validates system performance under realistic and peak traffic scenarios. Six scenarios are provided:

1. **Guest Browse** - Public product/category browsing (100-200 users)
2. **User Auth** - Login, register, token refresh (50 users)
3. **Shopping Cart** - Add/remove items, update quantities (75 users)
4. **Checkout** - Complete purchase flow with payment (30 users)
5. **Order Management** - View/manage orders (40 users)
6. **Mixed Traffic** - Realistic traffic distribution (150-300 users)

## Prerequisites

```bash
# Install Artillery
npm install --save-dev artillery artillery-plugin-expect

# Setup test database
docker-compose up -d postgres redis
npx prisma migrate deploy --skip-generate

# Seed test data
npm run load:setup

# Start application
npm run start:dev
```

## Running Load Tests

### Individual Scenarios

```bash
# Guest browsing
npm run load:guest

# User authentication
npm run load:auth

# Shopping cart operations
npm run load:cart

# Complete checkout flow
npm run load:checkout

# Order management
npm run load:orders
```

### Realistic Mixed Traffic

```bash
# Run mixed traffic simulation
npm run load:mixed
```

### Run All Scenarios

```bash
npm run load:all
```

### Generate HTML Report

```bash
npm run load:report
```

## Performance Targets

### Response Times

| Operation | p50 | p95 | p99 | Max |
|-----------|-----|-----|-----|-----|
| GET (simple) | <100ms | <200ms | <500ms | <1000ms |
| GET (complex) | <150ms | <300ms | <800ms | <1500ms |
| POST (write) | <200ms | <500ms | <1000ms | <2000ms |
| Payment ops | <500ms | <1000ms | <2000ms | <3000ms |

### Error Rates

- Overall: < 1%
- Client errors (4xx): < 0.5%
- Server errors (5xx): < 0.1%
- Database errors: 0%

### Throughput Targets

- Guest browsing: 200+ req/s
- Cart operations: 100+ req/s
- Order creation: 20+ req/s
- Mixed traffic: 300+ req/s at peak

## Monitoring During Tests

### Grafana Dashboard

Open http://localhost:3001 to view:
- Request rate (req/s)
- Response times (p50, p95, p99)
- Error rates
- Active connections
- Memory usage

### Prometheus Metrics

Access http://localhost:9090 to query:
```
http_requests_total
http_request_duration_seconds
http_requests_in_flight
process_resident_memory_bytes
```

### Application Logs

```bash
docker logs -f ecommerce_app
```

## Analyzing Results

### Artillery Report

After test completion, Artillery outputs:

```
Scenarios launched:    1200
Scenarios completed:   1195
Requests sent:        25000
Responses received:   24500

Min response time: 50ms
Max response time: 3500ms
Mean response time: 350ms
Median response time: 280ms
p95: 650ms
p99: 1200ms

Codes:
  200: 24000
  201: 400
  400: 50
  401: 25
  404: 25
```

### Key Metrics to Check

✅ Scenarios completed successfully > 99%
✅ p95/p99 within thresholds
✅ Error rate < 1%
✅ No timeout errors
✅ Throughput targets met
✅ Memory usage stable

## Common Issues & Solutions

### Issue: "Connection refused"

**Solution**: Ensure application is running on port 3000
```bash
npm run start:dev
```

### Issue: High error rate (>5%)

**Possible causes**:
- Application not running
- Database not responding
- Connection pool exhausted
- Invalid test data

**Solution**:
1. Check application logs: `docker logs -f ecommerce_app`
2. Verify database: `pg_isready -h localhost`
3. Check connection pool size in `schema.prisma`
4. Run `npm run load:setup` to seed data

### Issue: Slow response times (p95 > 1000ms)

**Possible causes**:
- High CPU usage
- Database queries too slow
- Stripe API latency
- Large result sets

**Solutions**:
1. Monitor CPU during test: `top` or Grafana
2. Check slow queries: `npx prisma studio`
3. Add database indexes
4. Reduce page size or use caching
5. Check Stripe API status

### Issue: "Too many clients" database error

**Cause**: Connection pool exhausted

**Solution**: Increase Prisma connection pool
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 50  // Increase from default 10
}
```

Then restart application:
```bash
npx prisma generate
npm run start:dev
```

## Advanced Scenarios

### Custom Scenario

Create a new file in `scenarios/` with custom load profile:

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "Custom Flow"
    flow:
      - get:
          url: "/api/products"
          expect:
            - statusCode: 200
```

Run with:
```bash
artillery run test/load/scenarios/custom.yml
```

### Load Profile Customization

Adjust load phases in any scenario:

```yaml
phases:
  # Warm-up: slow ramp-up
  - duration: 60
    arrivalRate: 10
    rampTo: 50
    name: "Warm-up"

  # Sustained: constant load
  - duration: 300
    arrivalRate: 100
    name: "Sustained"

  # Peak: sudden spike
  - duration: 120
    arrivalRate: 500
    name: "Peak"

  # Cool-down: gradual decrease
  - duration: 60
    arrivalRate: 500
    rampTo: 50
    name: "Cool-down"
```

## Best Practices

1. **Test Isolation**
   - Use test database
   - Reset data between runs
   - Clear Redis cache

2. **Gradual Ramp-Up**
   - Always include warm-up phase
   - Avoid cold start issues
   - Monitor during ramp-up

3. **Realistic Traffic**
   - Use varied product/user IDs
   - Mix read and write operations
   - Include realistic think time

4. **Monitoring**
   - Keep Grafana open
   - Watch memory for leaks
   - Check error logs
   - Monitor CPU usage

5. **Documentation**
   - Record baseline metrics
   - Track performance over time
   - Document changes made
   - Note environmental factors

## Environment Variables

Create `.env.load-test`:

```env
NODE_ENV=test
DATABASE_URL=postgresql://ecommerce_user:ecommerce_password@localhost:5432/ecommerce_load_test
REDIS_URL=redis://localhost:6379
PORT=3000
LOG_LEVEL=error
```

## Cleanup

After load testing:

```bash
# Reset test database
npm run load:clean

# Stop services
docker-compose down

# Clear reports
rm -f report.json report.html
```

## References

- [Artillery Documentation](https://artillery.io/docs)
- [Performance Best Practices](./docs/PERFORMANCE.md)
- [Bottleneck Analysis](./docs/BOTTLENECKS.md)

---

**Phase 7 Load Testing** - System validated for production load scenarios. 🚀
