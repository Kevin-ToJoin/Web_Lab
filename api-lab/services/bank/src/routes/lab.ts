import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'Vault Online API — TestLab 101 (Bank module)',
    requirements: [
      'A transfer must be atomic — debit and credit succeed together or not at all.',
      'A transfer must never drive an account below zero (no overdraft).',
      'Balances must stay correct under concurrent transfers.',
      'Money must be exact to the cent.',
      'A repeated Idempotency-Key must not post a second transfer.',
      'A customer may only read their own accounts (no IDOR).',
      'Transfer amounts must be positive.',
      'A transfer to a nonexistent account must not touch any balance.',
      'A statement’s closing balance must reconcile with the live ledger.',
      'GET /accounts/:id must 404 when the account does not exist.',
      '/admin/* must require an admin role and never expose other customers’ balances.',
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
