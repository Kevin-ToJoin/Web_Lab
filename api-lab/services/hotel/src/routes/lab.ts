import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'StayEasy Booking API — TestLab 101 (Hotel module)',
    requirements: [
      'Check-out must be strictly after check-in.',
      'A room must not be double-booked for overlapping dates.',
      'Nights = check_out − check_in (no inclusive off-by-one).',
      'Money must be exact to the cent.',
      'Guest count must not exceed the room capacity.',
      'A discount must be clamped to [0, 1]; a total must never go negative.',
      'Dates must be time-zone correct — a check-in maps to the same day everywhere.',
      'GET /bookings/:id must 404 when the booking does not exist.',
      'A malformed body must return 400 (JSON), never a 500 stack trace.',
      'Only a confirmed booking may be cancelled (not a checked-out one).',
      'A booking is readable only by its owner; guest PII must not leak.',
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
