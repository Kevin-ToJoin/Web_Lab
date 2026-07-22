import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'Trading Desk API — TestLab 101 (Trading module)',
    requirements: [
      'A buy must be rejected when it exceeds available buying power (cash).',
      'Balances must stay correct under concurrent orders (no double-spend).',
      'Money must be exact to the cent.',
      'A sell must not exceed the held quantity (no accidental short).',
      'Order quantity must be a positive integer.',
      'A market order fills at the live instrument price, not a client-supplied one.',
      'Cost basis must be the quantity-weighted average across buys.',
      'A repeated client_order_id must not create a second order.',
      'Order times must be time-zone correct (same instant everywhere).',
      'GET /orders/:id must 404 when the order does not exist.',
      'A malformed body must return 400 (JSON), never a 500 stack trace.',
      '/admin/* must require an admin role.',
    ],
    tip: 'Find the bugs with curl / Postman / psql / k6. Reveal the tagged solutions at GET /_lab/bugs?key=REVEAL',
  });
});

labRouter.get('/bugs', (req, res) => {
  if (req.query.key !== REVEAL_KEY) {
    return res.status(403).json({
      error: 'Locked. Try to find the bugs first, then append ?key=REVEAL.',
      count: KNOWN_BUGS.length,
    });
  }
  res.json({ count: KNOWN_BUGS.length, bugs: KNOWN_BUGS });
});
