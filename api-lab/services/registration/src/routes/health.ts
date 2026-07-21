import { Router } from 'express';
import { pool } from '../db.js';

export const healthRouter = Router();

// GET /health — correct: actually checks the database (503 when it's down).
healthRouter.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable', dependency: 'postgres' });
  }
});
