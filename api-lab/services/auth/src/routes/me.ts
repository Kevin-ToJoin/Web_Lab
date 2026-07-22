import { Router } from 'express';
import { query } from '../db.js';

export const meRouter = Router();
export const sessionsRouter = Router();

// GET /me — reads the token from `Authorization: Bearer <token>` or ?token=.
// Injected bugs (all "checks that aren't there"):
//   AUTH-03: sessions.expires_at is never checked (expired tokens work).
//   AUTH-07: sessions.revoked is never checked (logged-out tokens work).
//   AUTH-12: for MFA-enabled users, mfa_passed is never required.
meRouter.get('/', async (req, res) => {
  const header = req.headers.authorization ?? '';
  const token = header.replace(/^Bearer\s+/i, '') || String(req.query.token ?? '');

  const s = await query<{ user_id: number }>(
    `SELECT user_id FROM sessions WHERE token = $1`, [token],
  );
  if (!s.rows[0]) return res.status(401).json({ error: 'no such session' });

  // A correct /me would also verify: not expired, not revoked, and (if the user
  // has MFA) mfa_passed. None of those are checked here.
  const u = await query(
    `SELECT id, email, mfa_enabled FROM users WHERE id = $1`, [s.rows[0].user_id],
  );
  res.json(u.rows[0] ?? null);
});

// GET /sessions/:token — AUTH-09: a missing session returns 200 + null (not 404).
sessionsRouter.get('/:token', async (req, res) => {
  const { rows } = await query(
    `SELECT id, user_id, token, expires_at, mfa_passed, revoked
     FROM sessions WHERE token = $1`,
    [req.params.token],
  );
  res.json(rows[0] ?? null);
});
