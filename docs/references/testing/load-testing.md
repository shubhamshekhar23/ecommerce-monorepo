# Load Testing with k6

**Location:** `apps/backend/load-tests/k6/`

---

## What is Load Testing

Load testing verifies how a system behaves under traffic. It answers:
- How many concurrent users can the system handle?
- Where does it degrade — CPU, memory, DB connections, or event loop?
- Does it recover after a sudden spike, or does it stay degraded?
- Does it leak memory or connections over time?

Unit tests and E2E tests verify correctness. Load tests verify capacity and resilience.

---

## Types of Load Tests

### Smoke Test — `smoke.js`
- 1 VU, 30 seconds
- Purpose: verify all critical endpoints respond before running heavier tests
- Run this first. If smoke fails, do not proceed.

### Load Test — `load.js`
- Ramps to 50 VUs over 5 minutes
- Simulates realistic user flow: browse → search → product detail → add to cart
- Thresholds: <5% errors, P95 latency under 1 second
- This is your baseline — what the system looks like under normal traffic

### Stress Test — `stress.js`
- Ramps to 200 VUs aggressively
- Purpose: find where the system starts degrading (errors increase, latency climbs)
- The point where thresholds are violated is your degradation point

### Spike Test — `spike.js`
- 0 → 300 VUs in 10 seconds, holds for 1 minute, drops back to 0
- Simulates a flash sale or viral moment
- Watch whether the system recovers after the spike without manual intervention
- Allows up to 10% errors during the peak

### Breakpoint Test — `breakpoint.js`
- Increments 10 VUs every 30 seconds, goes up to 300 VUs
- Purpose: find the hard limit — the VU count where the system breaks
- Run once to establish a baseline, run again after optimisations to measure improvement
- WARNING: will cause errors and may briefly affect the live site — run during off-peak hours

### Soak Test — `soak.js`
- 20 VUs sustained for 1 hour (configurable)
- Purpose: detect memory leaks, connection leaks, gradual performance degradation
- These issues only appear after sustained traffic — invisible in shorter tests

---

## Running the Tests

Install k6:
```bash
brew install k6
```

Always run in this order:
```bash
# 1. Smoke — verify nothing is broken
k6 run apps/backend/load-tests/k6/smoke.js

# 2. Load — normal traffic baseline
k6 run apps/backend/load-tests/k6/load.js

# 3. Stress — find degradation point
k6 run apps/backend/load-tests/k6/stress.js

# 4. Spike — flash sale simulation
k6 run apps/backend/load-tests/k6/spike.js

# 5. Breakpoint — find hard limit (run during off-peak)
k6 run apps/backend/load-tests/k6/breakpoint.js

# 6. Soak — memory/connection leak detection (long running)
k6 run apps/backend/load-tests/k6/soak.js

# Soak with shorter duration for quick checks
k6 run --env DURATION=10m --env VUS=10 apps/backend/load-tests/k6/soak.js
```

---

## Reading k6 Output

```
✓ status 200              — check passed (green = good)
✗ status 200              — check failed (red = investigate)

http_req_duration p(95)=342ms  — 95% of requests completed in under 342ms
http_req_failed   0.12%        — 0.12% of requests returned an error
iterations        4523          — total number of VU iterations completed
```

Thresholds defined in each script are the pass/fail criteria. If a threshold is violated, k6 exits with a non-zero code — useful for CI integration later.

---

## What to Watch in Grafana While Tests Run

Open `http://185.214.134.81/grafana` while a test is running:

- **Request rate** — should climb proportionally with VUs
- **P95 latency** — should stay under 1s during load test; watch when it climbs during stress
- **Error rate** — first sign of a problem; spikes indicate a bottleneck
- **nodejs_heap_used_bytes** — during soak, should stay flat (sawtooth GC pattern is normal; a steady upward climb is a memory leak)
- **process_open_fds** — should stay flat; a rising count during soak means a connection or file descriptor leak
- **PgBouncer cl_waiting** — connections waiting for a DB slot; the most common bottleneck in Node/Postgres stacks

---

## Payment Flow Testing

Load testing the payment flow against real Stripe (even in test mode) is not practical — Stripe throttles test mode requests aggressively and the results are meaningless.

Real-world approach:
- **Correctness** (does payment work?) → E2E tests with Stripe test cards, run once per deploy
- **Load** (does checkout hold up under 50 concurrent users?) → run backend with `PAYMENT_PROVIDER=mock`, stress everything except the Stripe call
- **Resilience** → inject payment failures via the `BUG_SCENARIO` env variable (see Artillery debug scenarios)

---

## Configuration

`apps/backend/load-tests/k6/config.js` holds shared config:
- `BASE_URL` — defaults to `http://185.214.134.81`, override with `--env BASE_URL=http://...`
- Test credentials for the authenticated flow

```bash
# Run against a different environment
k6 run --env BASE_URL=http://localhost:3000 apps/backend/load-tests/k6/smoke.js
```
