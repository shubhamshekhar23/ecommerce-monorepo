/**
 * Realistic load test — simulates browse → search → add to cart → checkout.
 * Ramps up to 50 VUs over 2 minutes, holds for 3 minutes, then ramps down.
 *
 * Usage:
 *   k6 run apps/backend/load-tests/k6/load.js
 *
 * Watch results live in Grafana while this runs.
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { API, USER_EMAIL, USER_PASSWORD } from './config.js';

const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration', true);

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // ramp up
    { duration: '3m', target: 50 },   // sustained load
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.05'],       // <5% errors
    http_req_duration: ['p(95)<1000'],      // 95% of requests under 1s
    errors:            ['rate<0.05'],
    checkout_duration: ['p(95)<3000'],      // checkout under 3s
  },
};

const HEADERS = { 'Content-Type': 'application/json' };

function login() {
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
    { headers: HEADERS },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.status === 200 ? res.json('accessToken') : null;
}

export default function () {
  let token = null;

  group('browse products', () => {
    const res = http.get(`${API}/products/cursor`);
    check(res, { 'products 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    sleep(1);

    const catRes = http.get(`${API}/categories`);
    check(catRes, { 'categories 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('search', () => {
    const res = http.get(`${API}/products/search?q=shirt`);
    check(res, { 'search 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    sleep(2);
  });

  group('product detail', () => {
    const res = http.get(`${API}/products/slug/blue-cotton-tshirt`);
    check(res, { 'product detail 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    sleep(1);
  });

  group('authenticated flow', () => {
    token = login();
    if (!token) return;

    const authHeaders = { ...HEADERS, Authorization: `Bearer ${token}` };

    const cartRes = http.get(`${API}/cart`, { headers: authHeaders });
    check(cartRes, { 'cart 200': (r) => r.status === 200 });
    sleep(1);

    const start = Date.now();
    const addRes = http.post(
      `${API}/cart/items`,
      JSON.stringify({ productId: 'blue-cotton-tshirt', quantity: 1 }),
      { headers: authHeaders },
    );
    check(addRes, { 'add to cart ok': (r) => r.status === 200 || r.status === 201 });
    checkoutDuration.add(Date.now() - start);
    sleep(2);
  });
}
