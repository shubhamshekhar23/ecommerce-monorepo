/**
 * Breakpoint test — keeps increasing VUs until the system breaks.
 * Finds the hard limit of the system. Run once to establish a baseline,
 * then run again after optimisations to measure improvement.
 *
 * WARNING: This WILL cause errors and may briefly impact the live site.
 * Run during off-peak hours.
 *
 * What to watch in Grafana:
 *   - The VU count when error rate first exceeds 1% — that's your capacity limit
 *   - Which resource hits its ceiling first: CPU, memory, DB connections, or event loop lag
 *   - PgBouncer cl_waiting — usually the first bottleneck in Node/Postgres stacks
 *
 * Usage: k6 run apps/backend/load-tests/k6/breakpoint.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { API } from './config.js';

const errorRate = new Rate('errors');

export const options = {
  // Ramp up by 10 VUs every 30s — gives Grafana time to show the degradation
  stages: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '30s', target: 40 },
    { duration: '30s', target: 80 },
    { duration: '30s', target: 120 },
    { duration: '30s', target: 160 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 250 },
    { duration: '30s', target: 300 },
    { duration: '1m',  target: 0 },   // ramp down to let system recover
  ],
  // No thresholds — we want to observe naturally, not abort early
};

export default function () {
  const res = http.get(`${API}/products/cursor`);
  check(res, { 'status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(1);
}
