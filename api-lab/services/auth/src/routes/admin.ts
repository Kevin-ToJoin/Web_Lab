import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/users — AUTH-11: no authorization at all; it returns every user
// including the PLAINTEXT password. A real admin endpoint would require an admin
// role and never expose password material.
adminRouter.get('/users', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, email, password, mfa_enabled, failed_logins, created_at
     FROM users ORDER BY id`,
  );
  res.json(rows);
});
