import { Router } from 'express';
import { query } from '../db.js';

export const transactionsRouter = Router();

// GET /transactions/:id — WALL-08: a missing transaction returns 200 + null (not 404).
transactionsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, wallet_id, kind, amount, merchant, reversed, created_at
     FROM transactions WHERE id = $1`,
    [Number(req.params.id)],
  );
  res.json(rows[0] ?? null);
});

// POST /transactions/:id/reverse — WALL-12: the `reversed` flag is never set or
// checked, so the same payment can be refunded again and again.
transactionsRouter.post('/:id/reverse', async (req, res) => {
  const id = Number(req.params.id);
  const t = await query<{ wallet_id: number; amount: number; kind: string }>(
    `SELECT wallet_id, amount, kind FROM transactions WHERE id = $1`, [id],
  );
  if (!t.rows[0]) return res.status(404).json({ error: 'transaction not found' });
  // A correct reverse: `if (reversed) 409`, then set reversed = true. Neither happens.
  await query(`UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
    [t.rows[0].amount, t.rows[0].wallet_id]);
  await query(`INSERT INTO transactions (wallet_id, kind, amount) VALUES ($1, 'reversal', $2)`,
    [t.rows[0].wallet_id, t.rows[0].amount]);
  const after = await query<{ balance: number }>(`SELECT balance FROM wallets WHERE id = $1`, [t.rows[0].wallet_id]);
  res.json({ reversed_tx: id, refunded: t.rows[0].amount, balance: after.rows[0].balance });
});
