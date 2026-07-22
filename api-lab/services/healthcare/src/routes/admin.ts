import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/patients — HLTH-12: no authorization at all, and it returns every
// patient including ssn. A real admin endpoint would require an admin role and
// never expose PHI like SSNs.
adminRouter.get('/patients', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, dob, plan_tier, member_id, ssn, user_id FROM patients ORDER BY id`,
  );
  res.json(rows);
});
