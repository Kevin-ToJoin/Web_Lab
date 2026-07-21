import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'DevPortal Registration API — TestLab 101 (Registration module)',
    requirements: [
      'Email uniqueness is case-insensitive.',
      'Passwords are hashed (never stored or returned in plaintext).',
      'Password strength is enforced on the server.',
      'Verification codes are high-entropy, single-use, and expire.',
      'Codes are compared exactly (as strings) with an attempt limit.',
      'Age must be a plausible adult value (18..120).',
      'Auth responses must not reveal whether an email exists (no enumeration).',
      'Re-verifying an already-verified account is a no-op.',
      'Signup responses expose only safe fields.',
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
