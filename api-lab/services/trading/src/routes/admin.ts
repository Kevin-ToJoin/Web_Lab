import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/orders — TRAD-12: no authorization at all; it returns every
// account's orders (the whole order book). A real admin endpoint would require
// an admin role.
adminRouter.get('/orders', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, account_id, symbol, side, type, quantity, filled_price, status, created_at
     FROM orders ORDER BY id`,
  );
  res.json(rows);
});
