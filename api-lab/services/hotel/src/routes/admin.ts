import { Router } from 'express';
import { query } from '../db.js';

export const adminRouter = Router();

// GET /admin/bookings — HOTL-12: no authorization at all; it returns every
// booking including guest_email (PII). A real admin endpoint would require an
// admin role and strip PII.
adminRouter.get('/bookings', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, room_id, guest_name, guest_email, user_id, check_in, check_out, total, status
     FROM bookings ORDER BY id`,
  );
  res.json(rows);
});
