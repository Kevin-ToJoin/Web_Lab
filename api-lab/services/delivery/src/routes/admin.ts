import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/orders — DELV-12: no authorization at all; it returns every order
// including customer phone/address (PII). A real admin endpoint would require an
// admin role and strip PII.
adminRouter.get('/orders', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, restaurant_id, user_id, customer_name, customer_phone, customer_address,
            subtotal, total, status, placed_at
     FROM orders ORDER BY id`,
  );
  res.json(rows);
});
