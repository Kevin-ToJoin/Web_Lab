import { Router } from 'express';
import { query } from '../db.js';

export const categoriesRouter = Router();

// GET /categories — honest endpoint (not every route is buggy). Useful as
// ground truth to cross-check the category filter (CATA-01) and the pagination
// total (CATA-03).
categoriesRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT category, count(*)::int AS product_count
     FROM products GROUP BY category ORDER BY category`,
  );
  res.json(rows);
});
