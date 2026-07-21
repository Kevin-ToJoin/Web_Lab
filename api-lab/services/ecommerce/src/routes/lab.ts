import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

// GET /_lab/requirements — the contract the API is *supposed* to meet. This is
// the spec a tester checks behavior against (always available).
labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'OrderFlow API — TestLab 101 (API & Data track)',
    requirements: [
      'GET /products/:id must 404 when the product does not exist.',
      'POST /orders must 400 on a malformed payload and 201 on success (with a Location header).',
      'POST /orders must be idempotent when an Idempotency-Key header is supplied.',
      'Order creation must be atomic — no partial writes.',
      'Stock must never go below zero, even under concurrent orders.',
      'Money must be exact to the cent.',
      'POST /login must 401 on bad credentials and 429 after too many attempts.',
      'A user may only read their own orders (no IDOR).',
      '/admin/* must require an admin role and never expose password hashes.',
      'Async fulfillment must be idempotent and dead-letter poison messages.',
      'Errors must use a consistent JSON envelope; /health must reflect real dependency status.',
    ],
    tip: 'Find the bugs with curl / Postman / psql / k6. Reveal the tagged solutions at GET /_lab/bugs?key=REVEAL',
  });
});

// GET /_lab/bugs?key=REVEAL — the instructor-gated answer key, every bug tagged
// with its ISTQB classification (mirrors the frontend QA Inspector).
labRouter.get('/bugs', (req, res) => {
  if (req.query.key !== REVEAL_KEY) {
    return res.status(403).json({
      error: 'Locked. Try to find the bugs first, then append ?key=REVEAL to reveal the tagged answers.',
      count: KNOWN_BUGS.length,
    });
  }
  res.json({ count: KNOWN_BUGS.length, bugs: KNOWN_BUGS });
});
