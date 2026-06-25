/**
 * Spike test — simulates a sudden traffic burst (flash sale, viral post).
 * Goes from 0 to 300 VUs in 10s, holds for 1 minute, then drops back to 0.
 * Checks whether the system recovers after the spike without manual intervention.
 *
 * What to watch in Grafana:
 *   - Error rate during the spike peak
 *   - How fast latency recovers after VUs drop back to 0
 *   - Memory/heap — does it return to baseline after the spike?
 *
 * Usage: k6 run apps/backend/load-tests/k6/spike.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { API } from './config.js';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: 0 },    // baseline
    { duration: '10s', target: 300 },  // instant spike
    { duration: '1m',  target: 300 },  // hold at peak
    { duration: '10s', target: 0 },    // instant drop
    { duration: '2m',  target: 0 },    // recovery observation
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'],  // allow up to 10% errors during spike
  },
};

export default function () {
  const res = http.get(`${API}/products/cursor`);
  check(res, { 'status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(0.5);
}
