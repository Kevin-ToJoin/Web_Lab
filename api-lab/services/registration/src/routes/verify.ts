import { Router } from 'express';
import { query } from '../db.js';

export const verifyRouter = Router();

// POST /verify { email, code } — carries several injected bugs:
//   REGA-05: codes are compared numerically → leading zeros are ignored.
//   REGA-06: the code's expires_at is never checked.
//   REGA-07: there is no attempt limit → the short code is brute-forceable.
//   REGA-10: the `used` flag is never set or checked → the code is replayable.
//   REGA-11: an already-verified account re-runs verification and "succeeds".
verifyRouter.post('/', async (req, res) => {
  const { email, code } = req.body ?? {};

  const userRes = await query<{ id: number; status: string }>(
    `SELECT id, status FROM users WHERE email = $1`, [email],
  );
  const user = userRes.rows[0];
  if (!user) return res.status(404).json({ error: 'user not found' });

  const vcRes = await query<{ id: number; code: string; used: boolean }>(
    `SELECT id, code, used FROM verification_codes WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
    [user.id],
  );
  const vc = vcRes.rows[0];
  if (!vc) return res.status(400).json({ error: 'no verification code on file' });

  // REGA-05 (numeric compare), REGA-06 (no expiry check), REGA-07 (no attempt
  // cap), REGA-10 (never checks vc.used) all live in this one comparison.
  const ok = Number(code) === Number(vc.code);
  if (!ok) return res.status(401).json({ verified: false, error: 'invalid code' });

  // REGA-11: no short-circuit when user.status is already 'verified'.
  // REGA-10: vc.used is never set to true here.
  await query(`UPDATE users SET status = 'verified' WHERE id = $1`, [user.id]);
  res.json({ verified: true });
});
