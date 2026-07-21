import { Router } from 'express';
import { query } from '../db.js';

export const loginRouter = Router();

// POST /login { email, password } — carries:
//   REGA-08: user enumeration — the response distinguishes "email not found"
//            from "wrong password", leaking which emails are registered.
//   REGA-02: the password is compared in plaintext with ===.
loginRouter.post('/', async (req, res) => {
  const { email, password } = req.body ?? {};
  const { rows } = await query<{ id: number; password: string; status: string }>(
    `SELECT id, password, status FROM users WHERE email = $1`, [email],
  );
  const user = rows[0];

  // REGA-08: a distinct 404 for an unknown email is an enumeration oracle.
  if (!user) return res.status(404).json({ error: 'email not found' });

  // REGA-02: plaintext, non-constant-time comparison. REGA-08: a distinct 401.
  if (user.password !== password) {
    return res.status(401).json({ error: 'wrong password' });
  }

  res.json({ ok: true, userId: user.id, status: user.status });
});
