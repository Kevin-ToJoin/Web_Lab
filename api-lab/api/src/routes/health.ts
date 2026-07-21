import { Router } from 'express';

export const healthRouter = Router();

// GET /health — BUG-API-07: always reports 200 "ok" without actually checking
// any dependency. If Postgres or Redis is down, this still says the service is
// healthy — a false-positive that would defeat a load balancer's health probe.
healthRouter.get('/', (_req, res) => {
  // BUG-API-07: no `SELECT 1` against the pool, no Redis ping — just a constant.
  res.status(200).json({ status: 'ok' });
});
