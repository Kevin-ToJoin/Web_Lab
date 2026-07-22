-- Patient Portal (Healthcare module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. Deliberate integrity gaps used as QA bugs:
--   HLTH-02  appointments has NO UNIQUE(provider_id, slot_at) → double-booking
--   HLTH-10  appointments.slot_at is TIMESTAMP (no time zone) → "today" drifts

CREATE TABLE IF NOT EXISTS patients (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  dob          DATE NOT NULL,
  plan_tier    TEXT NOT NULL DEFAULT 'Bronze',   -- 'Bronze' | 'Silver' | 'Gold'
  member_id    TEXT NOT NULL,
  ssn          TEXT NOT NULL,                     -- HLTH-05: PHI, leaked by GET /patients/:id
  user_id      INTEGER NOT NULL,                  -- the account that owns this record
  deductible_met DOUBLE PRECISION NOT NULL DEFAULT 0  -- amount of deductible met this year
);

CREATE TABLE IF NOT EXISTS providers (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  specialty TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL REFERENCES patients(id),
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  slot_at     TIMESTAMP NOT NULL,                 -- HLTH-10: no time zone
  status      TEXT NOT NULL DEFAULT 'booked',     -- 'booked' | 'completed' | 'cancelled'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- HLTH-02: intentionally NO UNIQUE (provider_id, slot_at)
);

CREATE TABLE IF NOT EXISTS vitals (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL REFERENCES patients(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  systolic    INTEGER NOT NULL,                   -- HLTH-06: no CHECK range
  diastolic   INTEGER NOT NULL,
  heart_rate  INTEGER NOT NULL,
  temp_c      DOUBLE PRECISION NOT NULL
);
