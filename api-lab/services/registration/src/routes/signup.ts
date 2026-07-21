import { Router } from 'express';
import { query } from '../db.js';

export const signupRouter = Router();

// POST /signup — carries several injected bugs:
//   REGA-01: uniqueness is checked case-sensitively (Alice@ vs alice@).
//   REGA-02: the password is stored in plaintext.
//   REGA-03: no server-side password-strength check.
//   REGA-04: the verification code is low-entropy (Math.random, tiny range).
//   REGA-09: age is stored with no range check.
//   REGA-12: the full row (including the password) is echoed back.
signupRouter.post('/', async (req, res) => {
  const { email, username, password, age, phone, zip } = req.body ?? {};
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'email, username and password are required' });
  }

  // REGA-01: exact-case match — a cased variant slips past as "not existing".
  const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rows[0]) {
    return res.status(409).json({ error: 'email already registered' });
  }

  // REGA-03 (no strength check) + REGA-02 (plaintext) + REGA-09 (age unchecked).
  const { rows } = await query(
    `INSERT INTO users (email, username, password, age, phone, zip)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email, username, password, age ?? null, phone ?? null, zip ?? null],
  );
  const user = rows[0];

  // REGA-04: a guessable, non-uniform 0–9999 code, stored in the clear.
  const code = String(Math.floor(Math.random() * 10000));
  await query(
    `INSERT INTO verification_codes (user_id, code, expires_at)
     VALUES ($1, $2, now() + interval '15 minutes')`,
    [user.id, code],
  );

  // REGA-12: the response includes the plaintext password and every column.
  res.status(201).json({ user, note: 'a verification code was emailed' });
});
