import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'MobiTap Wallet API — TestLab 101 (Mobile Wallet module)',
    requirements: [
      'A payment must be rejected when it exceeds the wallet balance.',
      'Money must be exact to the cent.',
      'Balances must stay correct under concurrent taps (no double-spend).',
      'A payment amount must be positive.',
      'A repeated idempotency key must not charge twice.',
      'The daily spending limit must be enforced.',
      'A correct PIN is required above the contactless limit.',
      'GET /transactions/:id must 404 when it does not exist.',
      'A malformed body must return 400 (JSON), never a 500 stack trace.',
      'A wallet is readable only by its owner; the card number must be masked.',
      '/admin/* must require an admin role and never expose full PANs.',
      'A transaction may be reversed at most once.',
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
