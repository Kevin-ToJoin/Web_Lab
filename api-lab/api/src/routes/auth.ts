import { Router } from 'express';
import { query } from '../db.js';

export const authRouter = Router();

// POST /signup — BUG-DB-01: no uniqueness enforced, so the same email can
// register any number of times (the users table has no UNIQUE constraint and
// this handler never checks for an existing row).
authRouter.post('/signup', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const { rows } = await query<{ id: number; email: string; role: string }>(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     RETURNING id, email, role`,
    [email, `sha256:${password}`],
  );
  res.status(201).json(rows[0]);
});

// POST /login — two injected bugs:
//   BUG-API-04: a wrong password returns 200 { ok: false } instead of 401.
//   BUG-SEC-03: there is no rate limiting, so brute force is unthrottled.
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const { rows } = await query<{ id: number; role: string; password_hash: string }>(
    `SELECT id, role, password_hash FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  const user = rows[0];
  const ok = !!user && user.password_hash === `sha256:${password}`;

  // BUG-API-04: failure is reported with a 200 status.
  if (!ok) {
    return res.status(200).json({ ok: false, reason: 'invalid credentials' });
  }
  res.status(200).json({ ok: true, userId: user.id, role: user.role });
});
