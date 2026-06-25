/**
 * Stress test — pushes beyond normal load to find the breaking point.
 * Ramps up aggressively to 200 VUs. Watch Grafana for when errors spike.
 *
 * Usage: k6 run apps/backend/load-tests/k6/stress.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { API } from './config.js';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m',  target: 100 },
    { duration: '1m',  target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.20'],  // allow higher errors — we're stress testing
  },
};

export default function () {
  const res = http.get(`${API}/products/cursor`);
  check(res, { 'status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(0.5);
}
