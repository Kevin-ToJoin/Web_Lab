import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/wallets — WALL-11: no authorization at all; it returns every wallet
// including the full PAN. A real admin endpoint would require an admin role and
// mask the card number.
adminRouter.get('/wallets', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, user_id, holder, pan, balance, daily_limit, created_at
     FROM wallets ORDER BY id`,
  );
  res.json(rows);
});
