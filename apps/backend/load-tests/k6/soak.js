/**
 * Soak (endurance) test — runs at normal load for a long duration.
 * Purpose: catch memory leaks, connection leaks, and gradual degradation
 * that only appear after sustained traffic (not visible in short tests).
 *
 * Default duration: 1 hour at 20 VUs. Reduce for quick checks.
 *
 * What to watch in Grafana:
 *   - nodejs_heap_used_bytes — should stay flat (sawtooth GC pattern is normal)
 *   - process_open_fds — should stay flat (rising = connection/FD leak)
 *   - P95 latency — should stay consistent throughout, not drift upward
 *   - PgBouncer cl_waiting — should stay at 0
 *
 * Usage:
 *   k6 run apps/backend/load-tests/k6/soak.js
 *   k6 run --env DURATION=30m --env VUS=10 apps/backend/load-tests/k6/soak.js
 *
 * Usage: k6 run apps/backend/load-tests/k6/soak.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { API } from './config.js';

const errorRate = new Rate('errors');

const DURATION = __ENV.DURATION || '1h';
const VUS = parseInt(__ENV.VUS || '20');

export const options = {
  stages: [
    { duration: '2m',      target: VUS },  // ramp up
    { duration: DURATION,  target: VUS },  // sustained
    { duration: '2m',      target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    errors:            ['rate<0.01'],
  },
};

export default function () {
  group('product browsing', () => {
    const r1 = http.get(`${API}/products/cursor`);
    check(r1, { 'products 200': (r) => r.status === 200 });
    errorRate.add(r1.status !== 200);
    sleep(2);

    const r2 = http.get(`${API}/categories`);
    check(r2, { 'categories 200': (r) => r.status === 200 });
    errorRate.add(r2.status !== 200);
    sleep(1);

    const r3 = http.get(`${API}/products/search?q=laptop`);
    check(r3, { 'search 200': (r) => r.status === 200 });
    errorRate.add(r3.status !== 200);
    sleep(2);
  });
}
