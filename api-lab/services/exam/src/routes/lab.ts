import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'CertifyHub Exam API — TestLab 101 (Exam module)',
    requirements: [
      'The pass cutoff is inclusive — a score exactly at pass_pct passes (>=).',
      'The percentage must not be floored — borderline results must not be pushed down.',
      'Negative marking applies to wrong answers only, never to blanks.',
      'A submission after the time limit must be rejected (or auto-submitted at the deadline).',
      'A candidate may not exceed max_attempts.',
      'The questions endpoint must never reveal correct answers.',
      'An answer index must be within [0, num_options).',
      'GET /attempts/:id must 404 when the attempt does not exist.',
      'A malformed body must return 400 (JSON), never a 500 stack trace.',
      'A duplicate submission must not create a second attempt.',
      'A score must never go below 0.',
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
