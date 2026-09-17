// Characterization tests for the order path of the E-commerce lab backend.
//
// Like the bank suite, these assert what the service does TODAY — injected bugs
// included — so that a bug quietly ceasing to reproduce is caught instead of
// silently taking an exercise down with it. If one fails, either the bug was
// fixed deliberately (update the test and KNOWN_BUGS.md together) or something
// broke by accident.
//
// Only deterministic bugs live here. BUG-DB-05 (oversell) is a race that needs
// concurrent load to show up reliably, and it already has a purpose-built driver
// in api-lab/load/k6-oversell.js; asserting it from a single-threaded test would
// buy a flaky CI and no extra coverage.
//
// STOCK BUDGET — the seed gives coffee 5 units and the grinder 2, there is no
// restock endpoint, and every order here really decrements stock. So the suite
// has to live inside that: it spends 4 coffees and 1 grinder. Adding an order
// means checking the budget still fits, or the order after it fails with a 500
// "out of stock" that looks like a broken test.
//
// Run: node --test tests/*.test.mjs   (needs the API on $API_URL, Postgres, Redis)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4000';

const COFFEE = 1; // 'Premium Coffee Beans', 24.99, stock 5
const GRINDER = 4; // 'Electric Grinder',     75.00, stock 2
const MISSING_PRODUCT = 999_999;

// Orders are inserted with a sequence, so the id of the next insert is the last
// one seen plus one. Tracking it here lets the BUG-DB-03 test find the row the
// failed order strands without spending stock on a throwaway order first.
let lastOrderId = 0;

const placeOrder = (body, headers = {}) =>
  fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': '1', ...headers },
    body: JSON.stringify(body),
  });

async function placeOrderOk(body, headers = {}) {
  const res = await placeOrder(body, headers);
  assert.equal(res.status, 200, `POST /orders should have succeeded, got ${res.status}`);
  const order = await res.json();
  lastOrderId = Math.max(lastOrderId, order.id);
  return order;
}

before(async () => {
  const res = await fetch(`${API}/health`);
  assert.ok(res.ok, 'the API, its database and Redis must be up before these run');
});

test('an order is placed and priced from the product table', async () => {
  const order = await placeOrderOk({ items: [{ productId: COFFEE, quantity: 2 }] });

  assert.equal(order.status, 'paid');
  assert.equal(order.total, 49.98, '2 x 24.99');
});

test('BUG-API-03: a created order answers 200 with no Location header', async () => {
  const res = await placeOrder({ items: [{ productId: GRINDER, quantity: 1 }] });
  const order = await res.json();
  lastOrderId = Math.max(lastOrderId, order.id);

  assert.equal(res.status, 200, 'should be 201 for a created resource');
  assert.equal(res.headers.get('location'), null, 'and should point at the new order');
});

test('BUG-API-08: the Idempotency-Key is stored but never checked, so a retry buys twice', async () => {
  const headers = { 'idempotency-key': `test-${Date.now()}` };
  const items = [{ productId: COFFEE, quantity: 1 }];

  const first = await placeOrderOk({ items }, headers);
  const second = await placeOrderOk({ items }, headers);

  assert.notEqual(
    first.id,
    second.id,
    'the same key creates a second order instead of returning the first',
  );
});

test('BUG-DB-03: a failing item leaves the order row behind, with no transaction to undo it', async () => {
  assert.ok(lastOrderId > 0, 'an earlier test must have established the order sequence');
  const orphanId = lastOrderId + 1;

  const res = await placeOrder({ items: [{ productId: MISSING_PRODUCT, quantity: 1 }] });
  assert.equal(res.status, 500, 'an unknown product throws');

  const orphan = await fetch(`${API}/orders/${orphanId}`);
  assert.equal(orphan.status, 200, 'the order row was inserted before the item was validated');
  assert.equal((await orphan.json()).status, 'pending', 'and is stranded as pending, never paid');
  lastOrderId = orphanId;
});

test('BUG-API-02: a malformed items payload surfaces as a raw 500', async () => {
  const res = await placeOrder({ items: 'not-an-array' });

  assert.equal(res.status, 500, 'no shape validation: it should be a 400');
  lastOrderId += 1; // the order row is inserted before `items` is ever touched
});
