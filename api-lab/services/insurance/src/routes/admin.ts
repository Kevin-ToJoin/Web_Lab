import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/quotes — INSU-11: no authorization at all; it returns every quote
// including ssn/dob (PII). A real admin endpoint would require an admin role.
adminRouter.get('/quotes', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, product_id, user_id, applicant_name, dob, ssn, coverage_amount,
            age, region, premium, created_at
     FROM quotes ORDER BY id`,
  );
  res.json(rows);
});
