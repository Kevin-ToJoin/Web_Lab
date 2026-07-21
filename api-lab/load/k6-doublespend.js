// k6 load test that triggers the bank double-spend race (BANK-03).
//
//   docker compose up -d
//   k6 run load/k6-doublespend.js
//
// Account 1 (Alice) starts with $1,500.00. This fires 30 concurrent $100
// transfers from account 1 to account 3. A correct ledger reads the balance
// under a row lock, so at most 15 succeed and the balance never goes negative.
// The buggy one reads-then-writes with no lock, so many more slip through and
// the balance goes wrong — check it afterward:
//
//   curl localhost:4001/accounts/1        # observe an impossible balance
//
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    stampede: { executor: 'shared-iterations', vus: 30, iterations: 30, maxDuration: '10s' },
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:4001';

export default function () {
  const res = http.post(
    `${BASE}/transfers`,
    JSON.stringify({ fromId: 1, toId: 3, amount: 100 }),
    { headers: { 'Content-Type': 'application/json', 'X-User-Id': '1' } },
  );
  check(res, { 'posted': r => r.status === 200 });
}
