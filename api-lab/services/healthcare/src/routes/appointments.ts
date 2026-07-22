import { Router } from 'express';
import { query } from '../db.js';

export const appointmentsRouter = Router();

// POST /appointments { patient_id, provider_id, slot_at } — injected bugs:
//   HLTH-01: no check that slot_at is in the future (past bookings accepted).
//   HLTH-02: no conflict check → the same provider + slot can be booked twice.
//   HLTH-09: a malformed JSON body reaches the poor error handler as a 500.
appointmentsRouter.post('/', async (req, res) => {
  const { patient_id, provider_id, slot_at } = req.body ?? {};

  // HLTH-01: a real portal would reject slot_at <= now(). It doesn't.
  // HLTH-02: a real portal would SELECT ... WHERE provider_id AND slot_at first
  // (or rely on a UNIQUE constraint). It doesn't — it just inserts.
  const { rows } = await query(
    `INSERT INTO appointments (patient_id, provider_id, slot_at)
     VALUES ($1, $2, $3) RETURNING id, patient_id, provider_id, slot_at, status`,
    [patient_id, provider_id, slot_at],
  );
  res.status(201).json(rows[0]);
});

// GET /appointments?from=YYYY-MM-DD&to=YYYY-MM-DD — HLTH-07: the upper bound is
// end-EXCLUSIVE (slot_at < to), so an appointment on the "to" date is dropped.
appointmentsRouter.get('/', async (req, res) => {
  const from = String(req.query.from ?? '1900-01-01');
  const to = String(req.query.to ?? '2999-12-31');
  const { rows } = await query(
    `SELECT id, patient_id, provider_id, slot_at, status
     FROM appointments
     WHERE slot_at >= $1 AND slot_at < $2   -- HLTH-07: should be inclusive of $2
     ORDER BY slot_at`,
    [from, to],
  );
  res.json(rows);
});

// GET /appointments/today — HLTH-10: slot_at is a naive TIMESTAMP compared to the
// server's CURRENT_DATE, so a late-evening slot can appear on the wrong day for a
// client in another time zone.
appointmentsRouter.get('/today', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, patient_id, provider_id, slot_at, status
     FROM appointments WHERE slot_at::date = CURRENT_DATE ORDER BY slot_at`,
  );
  res.json(rows);
});

// POST /appointments/:id/cancel — HLTH-11: no state-transition guard, so a
// 'completed' (or already 'cancelled') appointment is happily "cancelled".
appointmentsRouter.post('/:id/cancel', async (req, res) => {
  const { rows } = await query(
    `UPDATE appointments SET status = 'cancelled' WHERE id = $1
     RETURNING id, status`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'appointment not found' });
  res.json(rows[0]);
});
