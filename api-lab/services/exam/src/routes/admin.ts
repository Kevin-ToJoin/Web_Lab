import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/results — EXAM-12: no authorization at all; it returns every
// candidate's attempts/scores. A real admin endpoint would require an admin role.
adminRouter.get('/results', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, exam_id, user_id, score, percentage, passed, submitted_at
     FROM attempts ORDER BY id`,
  );
  res.json(rows);
});
