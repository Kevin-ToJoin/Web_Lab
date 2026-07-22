-- StayEasy (Hotel module) — seed data.
-- Inserted by src/initDb.ts only when the rooms table is empty.

INSERT INTO rooms (number, type, capacity, nightly_rate) VALUES
  ('101', 'Standard', 2, 89.90),
  ('102', 'Standard', 2, 89.90),
  ('201', 'Deluxe',   3, 149.50),
  ('301', 'Suite',    4, 259.00);

-- One existing confirmed booking for room 201 (overlap tests target this room),
-- and one already checked-out booking (for the illegal cancel-transition test).
INSERT INTO bookings (room_id, guest_name, guest_email, user_id, check_in, check_out, guests, nights, total, status) VALUES
  (3, 'Alice Morgan', 'alice@stay.io', 1, now() + interval '5 days', now() + interval '8 days', 2, 3, 448.50, 'confirmed'),
  (1, 'Bob Carter',   'bob@stay.io',   2, now() - interval '10 days', now() - interval '7 days', 1, 3, 269.70, 'checked_out');
