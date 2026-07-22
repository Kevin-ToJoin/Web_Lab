import { Router } from 'express';
import { pool } from '../db.js';

export const healthRouter = Router();

// GET /health — correct on purpose: it actually checks the database before
// reporting healthy (503 when the dependency is down).
healthRouter.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable', dependency: 'postgres' });
  }
});
