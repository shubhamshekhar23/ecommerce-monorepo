/**
 * Smoke test — runs 1 VU for 30s to verify all critical endpoints respond.
 * Run before any load test to catch obvious breakage.
 *
 * Usage: k6 run apps/backend/load-tests/k6/smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { API } from './config.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const checks = [
    { name: 'health live',     url: `${API}/health/live` },
    { name: 'health ready',    url: `${API}/health/ready` },
    { name: 'products cursor', url: `${API}/products/cursor` },
    { name: 'categories',      url: `${API}/categories` },
  ];

  for (const { name, url } of checks) {
    const res = http.get(url);
    check(res, { [`${name} is 200`]: (r) => r.status === 200 });
    sleep(1);
  }
}
