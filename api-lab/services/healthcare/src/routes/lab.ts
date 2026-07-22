import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'Patient Portal API — TestLab 101 (Healthcare module)',
    requirements: [
      'An appointment must be in the future (no past-dated bookings).',
      'A provider must not be double-booked for the same time slot.',
      'Copay is a decision table of plan tier + whether the deductible is met; the threshold is inclusive (met means met at exactly the deductible).',
      'Pediatric pricing applies to ages under 18; age 18 is an adult.',
      'A patient record is readable only by its owner, and SSN/PHI must never reach the client.',
      'Vitals must be within plausible clinical ranges.',
      'A date-range appointment search must be inclusive of the end date.',
      'GET /patients/:id must 404 when the patient does not exist.',
      'A malformed body must return 400 (JSON), never a 500 stack trace.',
      'Appointment times must be time-zone correct — the same instant everywhere.',
      'Only a booked appointment may be cancelled (no cancelling a completed one).',
      '/admin/* must require an admin role and never expose PHI.',
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
