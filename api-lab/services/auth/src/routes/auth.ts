import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { query } from '../db.js';

export const authRouter = Router();

// POST /signup { email, password } — AUTH-01 (no strength check) + AUTH-05 (plaintext).
authRouter.post('/signup', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  // AUTH-01: a real service rejects weak passwords here. It doesn't.
  // AUTH-05: the password is stored as-is (plaintext).
  const { rows } = await query(
    `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, mfa_enabled`,
    [email, password],
  );
  res.status(201).json(rows[0]);
});

// POST /login { email, password } — AUTH-02 (no lockout) + AUTH-04 (enumeration).
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const u = await query<{ id: number; password: string; mfa_enabled: boolean }>(
    `SELECT id, password, mfa_enabled FROM users WHERE email = $1`, [email],
  );
  const user = u.rows[0];
  // AUTH-04: a distinct 404 for unknown accounts leaks which emails exist.
  if (!user) return res.status(404).json({ error: 'user not found' });

  if (user.password !== password) {
    // AUTH-02: the counter grows but nothing ever blocks the account.
    await query(`UPDATE users SET failed_logins = failed_logins + 1 WHERE id = $1`, [user.id]);
    return res.status(401).json({ error: 'invalid password' });
  }

  await query(`UPDATE users SET failed_logins = 0 WHERE id = $1`, [user.id]);
  const token = randomUUID();
  await query(
    `INSERT INTO sessions (user_id, token, expires_at, mfa_passed)
     VALUES ($1, $2, now() + interval '1 hour', $3)`,
    [user.id, token, !user.mfa_enabled],
  );
  res.json({ token, mfa_required: user.mfa_enabled });
});

// POST /login/verify-2fa { token, code } — AUTH-06: numeric compare (leading-zero bypass).
authRouter.post('/login/verify-2fa', async (req, res) => {
  const { token, code } = req.body ?? {};
  const s = await query<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM sessions WHERE token = $1`, [token],
  );
  if (!s.rows[0]) return res.status(404).json({ error: 'session not found' });
  const u = await query<{ mfa_code: string }>(
    `SELECT mfa_code FROM users WHERE id = $1`, [s.rows[0].user_id],
  );
  // AUTH-06: Number('42519') === Number('042519') is true.
  if (Number(code) !== Number(u.rows[0].mfa_code)) {
    return res.status(401).json({ error: 'invalid 2FA code' });
  }
  await query(`UPDATE sessions SET mfa_passed = true WHERE id = $1`, [s.rows[0].id]);
  res.json({ mfa_passed: true });
});

// POST /logout { token } — AUTH-07: never sets sessions.revoked, so the token lives on.
authRouter.post('/logout', async (req, res) => {
  const { token } = req.body ?? {};
  // A real logout: UPDATE sessions SET revoked = true WHERE token = $1. This does nothing.
  await query(`SELECT 1 FROM sessions WHERE token = $1`, [token]);
  res.json({ ok: true });
});

// POST /reset/request { email } — issues a single-use reset code (returned here for the lab).
authRouter.post('/reset/request', async (req, res) => {
  const { email } = req.body ?? {};
  const u = await query<{ id: number }>(`SELECT id FROM users WHERE email = $1`, [email]);
  if (!u.rows[0]) return res.status(404).json({ error: 'user not found' });
  const code = randomUUID().slice(0, 8);
  await query(
    `INSERT INTO reset_codes (code, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
    [code, u.rows[0].id],
  );
  res.status(201).json({ code });
});

// POST /reset/confirm { code, new_password } — AUTH-08: the code's `used` flag is
// never set or checked, so the same code works again and again.
authRouter.post('/reset/confirm', async (req, res) => {
  const { code, new_password } = req.body ?? {};
  const r = await query<{ user_id: number }>(
    `SELECT user_id FROM reset_codes WHERE code = $1`, [code],
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'invalid code' });
  // AUTH-08: no `if (used) 409`, no `SET used = true`.
  await query(`UPDATE users SET password = $1 WHERE id = $2`, [new_password, r.rows[0].user_id]);
  res.json({ ok: true });
});
