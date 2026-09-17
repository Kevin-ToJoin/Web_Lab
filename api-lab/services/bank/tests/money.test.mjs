// Characterization tests for the money path of the Bank lab backend.
//
// These assert the service behaves as it does TODAY, injected bugs included.
// That is the point: the bugs are the teaching material, so a test that demanded
// correct behaviour would fail by design and teach nothing. What these catch is
// an ACCIDENTAL change — a bug that quietly stops reproducing takes an exercise
// down with it, and until now nothing would have noticed.
//
// Same convention as the frontend suite (see the README note on unit tests): if
// one of these starts failing, either the bug was fixed on purpose — update the
// test and the lab's KNOWN_BUGS.md together — or something broke by accident.
//
// Run: node --test tests/*.test.mjs          (needs the API on $API_URL and its Postgres)
//
// Every assertion is a DELTA on the balances it reads first: the seed only runs
// on an empty database, so absolute amounts depend on what ran before.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4001';

const ALICE = 1; // 1001-2002-3003
const BOB = 3; // 4004-5005-6006
const MISSING_ACCOUNT = 999_999;

const balanceOf = async (id) => {
  const res = await fetch(`${API}/accounts/${id}`);
  assert.equal(res.status, 200, `GET /accounts/${id} should answer 200`);
  return Number((await res.json()).balance);
};

const transfer = (body, headers = {}) =>
  fetch(`${API}/transfers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

before(async () => {
  const res = await fetch(`${API}/health`);
  assert.equal(res.status, 200, 'the API and its database must be up before these run');
});

test('a transfer moves the amount from source to destination', async () => {
  const [from, to] = [await balanceOf(ALICE), await balanceOf(BOB)];

  const res = await transfer({ fromId: ALICE, toId: BOB, amount: 100 });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'posted');

  assert.equal(await balanceOf(ALICE), from - 100);
  assert.equal(await balanceOf(BOB), to + 100);
});

test('BANK-02: a transfer beyond the balance is accepted and overdraws the account', async () => {
  const from = await balanceOf(ALICE);
  const amount = from + 10_000; // more than there is

  const res = await transfer({ fromId: ALICE, toId: BOB, amount });
  assert.equal(res.status, 200, 'no overdraft guard: the transfer posts');

  const after = await balanceOf(ALICE);
  assert.equal(after, from - amount);
  assert.ok(after < 0, 'the balance is left negative');

  await transfer({ fromId: BOB, toId: ALICE, amount }); // put it back
});

test('BANK-07: a non-positive amount is accepted and moves money backwards', async () => {
  const [from, to] = [await balanceOf(ALICE), await balanceOf(BOB)];

  const res = await transfer({ fromId: ALICE, toId: BOB, amount: -50 });
  assert.equal(res.status, 200, 'no `amount > 0` guard');

  // Debiting a negative amount CREDITS the source and debits the destination.
  assert.equal(await balanceOf(ALICE), from + 50);
  assert.equal(await balanceOf(BOB), to - 50);
});

test('BANK-05: the Idempotency-Key is stored but never checked, so a retry pays twice', async () => {
  const from = await balanceOf(ALICE);
  const headers = { 'idempotency-key': `test-${Date.now()}` };

  const first = await transfer({ fromId: ALICE, toId: BOB, amount: 25 }, headers);
  const second = await transfer({ fromId: ALICE, toId: BOB, amount: 25 }, headers);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.notEqual(
    (await first.json()).id,
    (await second.json()).id,
    'the same key creates a second transfer instead of returning the first',
  );
  assert.equal(await balanceOf(ALICE), from - 50, 'debited twice for one intent');
});

test('BANK-08: a transfer to a nonexistent account debits the source and loses the money', async () => {
  const from = await balanceOf(ALICE);

  const res = await transfer({ fromId: ALICE, toId: MISSING_ACCOUNT, amount: 75 });
  assert.equal(res.status, 404, 'the destination is reported missing');

  assert.equal(
    await balanceOf(ALICE),
    from - 75,
    'but the debit already happened and is not reversed',
  );
});

test('BANK-01: a crash after the debit is not rolled back, so the funds vanish', async () => {
  const [from, to] = [await balanceOf(ALICE), await balanceOf(BOB)];

  const res = await transfer({ fromId: ALICE, toId: BOB, amount: 60, simulateCrash: true });
  assert.equal(res.status, 500, 'settlement throws after debiting');

  assert.equal(await balanceOf(ALICE), from - 60, 'source debited');
  assert.equal(
    await balanceOf(BOB),
    to,
    'destination never credited — no transaction wraps the two',
  );
});
