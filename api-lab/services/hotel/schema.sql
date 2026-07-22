-- StayEasy (Hotel module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. Deliberate gaps used as QA bugs:
--   HOTL-02  bookings has NO overlap/capacity constraint → overbooking
--   HOTL-04  nightly_rate / total are DOUBLE PRECISION (float) → price drift
--   HOTL-07  bookings.check_in is TIMESTAMP (no time zone) → "arrivals" drift

CREATE TABLE IF NOT EXISTS rooms (
  id           SERIAL PRIMARY KEY,
  number       TEXT NOT NULL,
  type         TEXT NOT NULL,                    -- 'Standard' | 'Deluxe' | 'Suite'
  capacity     INTEGER NOT NULL,                 -- max guests
  nightly_rate DOUBLE PRECISION NOT NULL         -- HOTL-04: money as float
);

CREATE TABLE IF NOT EXISTS bookings (
  id          SERIAL PRIMARY KEY,
  room_id     INTEGER NOT NULL REFERENCES rooms(id),
  guest_name  TEXT NOT NULL,
  guest_email TEXT NOT NULL,                     -- HOTL-11: PII, leaked by GET /bookings/:id
  user_id     INTEGER NOT NULL,                  -- the account that owns this booking
  check_in    TIMESTAMP NOT NULL,               -- HOTL-07: no time zone
  check_out   TIMESTAMP NOT NULL,
  guests      INTEGER NOT NULL DEFAULT 1,
  nights      INTEGER NOT NULL,
  total       DOUBLE PRECISION NOT NULL,         -- HOTL-04: money as float
  status      TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'cancelled' | 'checked_out'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- HOTL-02: intentionally NO EXCLUDE/UNIQUE preventing overlapping bookings.
);
