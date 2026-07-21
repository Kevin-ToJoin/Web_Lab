// k6 load test that triggers the overselling race condition (BUG-DB-05).
//
//   docker compose up -d          # start the lab
//   k6 run load/k6-oversell.js    # needs k6 installed locally (grafana/k6)
//
// "Ceramic Mug" (product id 2) is seeded with stock = 3. This fires 20 orders
// for it at the same instant. A correct backend lets at most 3 succeed and
// keeps stock >= 0. The buggy one reads-then-writes with no row lock, so many
// orders slip through and the stock goes NEGATIVE — check it afterward:
//
//   curl localhost:4000/products/2      # observe stock < 0
//
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    stampede: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 20,
      maxDuration: '10s',
    },
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const res = http.post(
    `${BASE}/orders`,
    JSON.stringify({ items: [{ productId: 2, quantity: 1 }] }),
    { headers: { 'Content-Type': 'application/json', 'X-User-Id': '1' } },
  );
  check(res, { 'created': r => r.status === 200 || r.status === 201 });
}
