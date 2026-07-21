import { Router } from 'express';
import { query } from '../db.js';

export const transfersRouter = Router();

// POST /transfers — the core money-moving endpoint, carrying most of the bugs:
//   BANK-01: no transaction — a crash after the debit loses money (simulateCrash).
//   BANK-02: no overdraft check — the balance can go negative.
//   BANK-03: read-then-write with no row lock — concurrent transfers race.
//   BANK-04: amounts accumulate as floats in DOUBLE columns.
//   BANK-05: the Idempotency-Key is stored but never checked.
//   BANK-07: a non-positive amount is accepted.
//   BANK-08: a transfer to a nonexistent account debits the source anyway.
//   BANK-11: a malformed payload throws → unhandled 500.
transfersRouter.post('/', async (req, res) => {
  const body = req.body ?? {};
  // BANK-05: read the idempotency key, then never look it up.
  const idemKey = req.header('idempotency-key') ?? null;

  // BANK-11: no shape validation — a missing/typed-wrong field flows straight
  // into SQL and surfaces as a raw 500.
  const { fromId, toId, amount, simulateCrash } = body;

  // BANK-03: no SELECT … FOR UPDATE — the balance is read without a lock.
  const src = await query<{ id: number; balance: number }>(
    `SELECT id, balance FROM accounts WHERE id = $1`, [fromId],
  );
  if (!src.rows[0]) return res.status(404).json({ error: 'source account not found' });

  // BANK-02 (no overdraft guard) and BANK-07 (no `amount > 0` guard) are the
  // checks that are deliberately absent here.

  // Debit the source. BANK-04: float arithmetic on money.
  await query(`UPDATE accounts SET balance = balance - $1 WHERE id = $2`, [amount, fromId]);
  await query(
    `INSERT INTO transactions (account_id, kind, amount, ref) VALUES ($1, 'debit', $2, 'transfer')`,
    [fromId, amount],
  );

  // BANK-01: a failure here — after the debit, before the credit — is never
  // rolled back, so the money simply disappears.
  if (simulateCrash) {
    throw new Error('settlement crashed after debiting the source');
  }

  // BANK-08: if the destination does not exist we return 404, but the debit
  // above has already been applied and is never reversed — funds vanish.
  const dest = await query<{ id: number }>(`SELECT id FROM accounts WHERE id = $1`, [toId]);
  if (!dest.rows[0]) return res.status(404).json({ error: 'destination account not found' });

  await query(`UPDATE accounts SET balance = balance + $1 WHERE id = $2`, [amount, toId]);
  await query(
    `INSERT INTO transactions (account_id, kind, amount, ref) VALUES ($1, 'credit', $2, 'transfer')`,
    [toId, amount],
  );

  const t = await query<{ id: number }>(
    `INSERT INTO transfers (from_id, to_id, amount, idem_key, status)
     VALUES ($1, $2, $3, $4, 'posted') RETURNING id`,
    [fromId, toId, amount, idemKey],
  );

  res.json({ id: t.rows[0].id, fromId, toId, amount, status: 'posted' });
});
