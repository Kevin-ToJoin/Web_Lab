import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'SecureQuote Insurance API — TestLab 101 (Insurance module)',
    requirements: [
      'The young-driver loading applies only under 25 (age < 25).',
      'The total discount is clamped; a premium never goes below 0.',
      'Independent risk loadings multiply, not add.',
      'Premiums must be exact to the cent.',
      'Coverage amount must be a positive number.',
      'Only a real boolean true applies the smoker loading.',
      'The no-claims discount applies only at 0 prior claims.',
      'GET /quotes/:id must 404 when the quote does not exist.',
      'A malformed body must return 400 (JSON), never a 500 stack trace.',
      'A quote is readable only by its owner; SSN/DOB must not leak.',
      '/admin/* must require an admin role.',
      'The high-risk-region loading applies to every product, not just Auto.',
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
