import { Router } from 'express';
import { query } from '../db.js';

export const bookingsRouter = Router();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// POST /bookings { room_id, guest_name, guest_email, user_id, check_in, check_out, guests, discount? }
// A cluster of injected bugs:
//   HOTL-01: no check that check_out is strictly after check_in.
//   HOTL-02: no overlap/availability check → the room can be overbooked.
//   HOTL-03: nights are counted inclusively (day diff + 1) → an extra night.
//   HOTL-04: total is float math.
//   HOTL-05: no check that guests <= room capacity.
//   HOTL-06: discount is not clamped to [0,1] → a total can go negative.
bookingsRouter.post('/', async (req, res) => {
  const { room_id, guest_name, guest_email, user_id, check_in, check_out, guests = 1, discount = 0 } = req.body ?? {};

  const room = await query<{ nightly_rate: number; capacity: number }>(
    `SELECT nightly_rate, capacity FROM rooms WHERE id = $1`, [room_id],
  );
  if (!room.rows[0]) return res.status(404).json({ error: 'room not found' });

  // HOTL-03: the "+ 1" is the inclusive off-by-one. Correct is just the day diff.
  const nights = Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / MS_PER_DAY) + 1;

  // HOTL-04 (float) + HOTL-06 (discount never clamped to [0,1]).
  const total = nights * Number(room.rows[0].nightly_rate) * (1 - Number(discount));

  // HOTL-01: no `if (check_out <= check_in) 400`.
  // HOTL-02: no overlap query against existing confirmed bookings for this room.
  // HOTL-05: no `if (guests > capacity) 400`.
  const { rows } = await query(
    `INSERT INTO bookings (room_id, guest_name, guest_email, user_id, check_in, check_out, guests, nights, total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, room_id, guest_name, user_id, check_in, check_out, guests, nights, total, status`,
    [room_id, guest_name, guest_email, user_id, check_in, check_out, guests, nights, total],
  );
  res.status(201).json(rows[0]);
});

// GET /bookings/arrivals — HOTL-07: check_in is a naive TIMESTAMP compared to the
// server's CURRENT_DATE, so a late-evening arrival can land on the wrong day for
// a client in another time zone.
bookingsRouter.get('/arrivals', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, room_id, guest_name, check_in, status
     FROM bookings WHERE check_in::date = CURRENT_DATE ORDER BY check_in`,
  );
  res.json(rows);
});

// GET /bookings/:id — HOTL-08 (missing → 200 null) + HOTL-11 (returns guest_email,
// no ownership check).
bookingsRouter.get('/:id', async (req, res) => {
  // HOTL-11: X-User-Id is never compared to user_id, and guest_email is selected.
  const { rows } = await query(
    `SELECT id, room_id, guest_name, guest_email, user_id, check_in, check_out, guests, nights, total, status
     FROM bookings WHERE id = $1`,
    [Number(req.params.id)],
  );
  // HOTL-08: rows[0] is undefined for a missing id → serialized as null, 200.
  res.json(rows[0] ?? null);
});

// POST /bookings/:id/cancel — HOTL-10: no state-transition guard, so a
// 'checked_out' (or already 'cancelled') booking is happily "cancelled".
bookingsRouter.post('/:id/cancel', async (req, res) => {
  const { rows } = await query(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING id, status`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'booking not found' });
  res.json(rows[0]);
});
