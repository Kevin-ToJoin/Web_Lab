import { Router } from 'express';
import { KNOWN_BUGS } from '../knownBugs.js';

export const labRouter = Router();

const REVEAL_KEY = 'REVEAL';

labRouter.get('/requirements', (_req, res) => {
  res.json({
    service: 'VaultAuth Security API — TestLab 101 (Auth module)',
    requirements: [
      'Signup must enforce a password-strength policy.',
      'Repeated failed logins must lock or throttle the account.',
      'An expired session token must be rejected.',
      'Login must not disclose whether an account exists (no enumeration).',
      'Passwords must be hashed and never returned.',
      '2FA codes must be compared as fixed-length strings, not numbers.',
      'Logout must invalidate the session token.',
      'A password-reset code must be single-use.',
      'GET /sessions/:token must 404 when the session does not exist.',
      'A malformed body must return 400 (JSON), never a 500 stack trace.',
      '/admin/* must require an admin role and never expose passwords.',
      'For MFA-enabled users, 2FA must be completed before a session is trusted.',
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
