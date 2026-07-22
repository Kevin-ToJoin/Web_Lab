import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'QuickBite Delivery API — TestLab 101 (Delivery module)',
    requirements: [
      'A delivery beyond the restaurant’s max distance (out of zone) must be rejected.',
      'An order below the restaurant’s minimum must be rejected.',
      'Orders outside operating hours must be rejected.',
      'Money must be exact to the cent.',
      'Non-stackable promo codes must not stack.',
      'Tip is a non-negative percentage of the food subtotal (not the delivery fee).',
      'The free-delivery threshold is inclusive (>=).',
      'GET /orders/:id must 404 when the order does not exist.',
      'A malformed body must return 400 (JSON), never a 500 stack trace.',
      'Only a placed order may be cancelled (not a delivered one).',
      'An order is readable only by its owner; customer PII must not leak.',
      '/admin/* must require an admin role.',
    ],
    tip: 'Find the bugs with curl / Postman / psql. Reveal the tagged solutions at GET /_lab/bugs?key=REVEAL',
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
