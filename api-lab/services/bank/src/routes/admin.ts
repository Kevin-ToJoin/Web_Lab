import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/accounts — BANK-12: no authorization check. Any caller sees every
// customer's account number, owner, and balance.
adminRouter.get('/accounts', async (_req, res) => {
  // BANK-12: no role gate; every customer's balance is exposed.
  const { rows } = await query(
    `SELECT id, number, owner, user_id, balance FROM accounts ORDER BY id`,
  );
  res.json(rows);
});
