import { Router } from 'express';
import { query } from '../db.js';
import { fulfillmentQueue } from '../queue.js';

export const adminRouter = Router();

// GET /admin/users — BUG-SEC-02: no authorization check, and the response
// includes password_hash (sensitive data exposure). Anyone can call it.
adminRouter.get('/users', async (_req, res) => {
  // BUG-SEC-02: SELECT * leaks password_hash; there is no role gate.
  const { rows } = await query(`SELECT * FROM users ORDER BY id`);
  res.json(rows);
});

// GET /admin/queue — queue stats so learners can watch BUG-Q-01 / BUG-Q-02.
// (This endpoint itself is fine; it's the observability window into the bugs.)
adminRouter.get('/queue', async (_req, res) => {
  const counts = await fulfillmentQueue.getJobCounts(
    'waiting', 'active', 'completed', 'failed', 'delayed',
  );
  const failed = await fulfillmentQueue.getFailed(0, 20);
  res.json({
    counts,
    failed: failed.map(j => ({
      id: j.id,
      name: j.name,
      attemptsMade: j.attemptsMade,
      failedReason: j.failedReason,
      data: j.data,
    })),
  });
});
