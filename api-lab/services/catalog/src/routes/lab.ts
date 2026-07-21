import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'TechMart Catalog API — TestLab 101 (Catalog module)',
    requirements: [
      'A category filter returns only that category.',
      'Search is case-insensitive and matches product names.',
      'Pagination: `total` reflects the active filters; a page past the end is empty; page must be >= 1.',
      'Sorting is restricted to known columns (no injection).',
      'A product with no reviews returns an empty list — never another product\'s.',
      'Average rating is accurate (not integer-truncated).',
      'A submitted rating must be 1..5; review text must be sanitized.',
      'GET /products/:id must 400 on a non-numeric id and 404 when missing.',
      'Listing with reviews must not issue a query per product (no N+1).',
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
