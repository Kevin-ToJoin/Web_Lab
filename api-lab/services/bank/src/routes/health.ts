import { Router } from 'express';
import { pool } from '../db.js';

export const healthRouter = Router();

// GET /health — this one is CORRECT on purpose: it actually checks the database
// before reporting healthy (a 503 when the dependency is down). Not every module
// repeats the same lesson — compare this with the ecommerce module's broken
// health check (BUG-API-07).
healthRouter.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable', dependency: 'postgres' });
  }
});
