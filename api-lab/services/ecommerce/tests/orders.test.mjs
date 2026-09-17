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
// Run: node --test tests/      (needs the API on $API_URL, its Postgres and Redis)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4000';

const COFFEE = 1;         // 'Premium Coffee Beans', seeded with stock 5
const MISSING_PRODUCT = 999_999;

const placeOrder = (body, headers = {}) =>
  fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': '1', ...headers },
    body: JSON.stringify(body),
  });

const getOrder = (id) => fetch(`${API}/orders/${id}`);

before(async () => {
  const res = await fetch(`${API}/health`);
  assert.ok(res.ok, 'the API, its database and Redis must be up before these run');
});

test('an order is placed and priced from the product table', async () => {
  const res = await placeOrder({ items: [{ productId: COFFEE, quantity: 2 }] });
  const order = await res.json();

  assert.equal(order.status, 'paid');
  assert.equal(order.total, 49.98, '2 x 24.99');
});

test('BUG-API-03: a created order answers 200 with no Location header', async () => {
  const res = await placeOrder({ items: [{ productId: COFFEE, quantity: 1 }] });

  assert.equal(res.status, 200, 'should be 201 for a created resource');
  assert.equal(res.headers.get('location'), null, 'and should point at the new order');
});

test('BUG-API-08: the Idempotency-Key is stored but never checked, so a retry buys twice', async () => {
  const headers = { 'idempotency-key': `test-${Date.now()}` };

  const first = await (await placeOrder({ items: [{ productId: COFFEE, quantity: 1 }] }, headers)).json();
  const second = await (await placeOrder({ items: [{ productId: COFFEE, quantity: 1 }] }, headers)).json();

  assert.notEqual(first.id, second.id, 'the same key creates a second order instead of returning the first');
});

test('BUG-DB-03: a failing item leaves the order row behind, with no transaction to undo it', async () => {
  // Learn where the sequence is: the next insert takes the following id.
  const previous = await (await placeOrder({ items: [{ productId: COFFEE, quantity: 1 }] })).json();

  const res = await placeOrder({ items: [{ productId: MISSING_PRODUCT, quantity: 1 }] });
  assert.equal(res.status, 500, 'an unknown product throws');

  const orphan = await getOrder(previous.id + 1);
  assert.equal(orphan.status, 200, 'the order row was inserted before the item was validated');
  assert.equal((await orphan.json()).status, 'pending', 'and is stranded as pending, never paid');
});

test('BUG-API-02: a malformed items payload surfaces as a raw 500', async () => {
  const res = await placeOrder({ items: 'not-an-array' });

  assert.equal(res.status, 500, 'no shape validation: it should be a 400');
});
