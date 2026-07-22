import { Router } from 'express';
import { query } from '../db.js';

export const walletsRouter = Router();

const CONTACTLESS_LIMIT = 50;

// GET /wallets/:id — WALL-10: returns the full PAN, no ownership check.
walletsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, user_id, holder, pan, balance, daily_limit FROM wallets WHERE id = $1`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'wallet not found' });
  res.json(rows[0]); // pan is the full card number — should be masked + owner-only
});

// POST /wallets/:id/pay { amount, merchant, pin, idem_key } — a cluster of bugs:
//   WALL-04: amount is never validated positive.
//   WALL-07: no PIN check above the contactless limit.
//   WALL-06: the daily limit is never enforced.
//   WALL-05: idem_key is never checked (retries charge again).
//   WALL-03: balance is read then updated with no lock (concurrent double-spend).
//   WALL-01: no `if (amount > balance) 400`.
//   WALL-02: float money math.
walletsRouter.post('/:id/pay', async (req, res) => {
  const id = Number(req.params.id);
  const { amount, merchant, idem_key } = req.body ?? {};

  const w = await query<{ balance: number }>(`SELECT balance FROM wallets WHERE id = $1`, [id]);
  if (!w.rows[0]) return res.status(404).json({ error: 'wallet not found' });

  // WALL-04/06/07/01/05: every guard that should be here is missing.
  const amt = Number(amount);

  // WALL-03: read-modify-write with no row lock / transaction.
  await query(`UPDATE wallets SET balance = balance - $1 WHERE id = $2`, [amt, id]);
  const { rows } = await query(
    `INSERT INTO transactions (wallet_id, kind, amount, merchant, idem_key)
     VALUES ($1, 'payment', $2, $3, $4)
     RETURNING id, wallet_id, kind, amount, merchant, created_at`,
    [id, amt, merchant ?? null, idem_key ?? null],
  );
  const after = await query<{ balance: number }>(`SELECT balance FROM wallets WHERE id = $1`, [id]);
  res.status(201).json({ ...rows[0], balance: after.rows[0].balance });
  void CONTACTLESS_LIMIT; // documented above; intentionally never enforced (WALL-07)
});

// POST /wallets/:id/topup { amount } — add funds.
walletsRouter.post('/:id/topup', async (req, res) => {
  const id = Number(req.params.id);
  const amt = Number(req.body?.amount);
  const w = await query(`SELECT 1 FROM wallets WHERE id = $1`, [id]);
  if (!w.rows[0]) return res.status(404).json({ error: 'wallet not found' });
  await query(`UPDATE wallets SET balance = balance + $1 WHERE id = $2`, [amt, id]);
  await query(`INSERT INTO transactions (wallet_id, kind, amount) VALUES ($1, 'topup', $2)`, [id, amt]);
  const after = await query<{ balance: number }>(`SELECT balance FROM wallets WHERE id = $1`, [id]);
  res.status(201).json({ wallet_id: id, balance: after.rows[0].balance });
});
