-- SecureQuote (Insurance module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. Deliberate gaps used as QA bugs:
--   INSU-04  base_rate / premium are DOUBLE PRECISION (float) → premium drift
--   INSU-10  quotes.ssn / dob are PII, leaked by GET /quotes/:id

CREATE TABLE IF NOT EXISTS products (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,                    -- 'Auto' | 'Home' | 'Life'
  base_rate DOUBLE PRECISION NOT NULL         -- premium per $1,000 of coverage
);

CREATE TABLE IF NOT EXISTS promos (
  code         TEXT PRIMARY KEY,
  discount_pct DOUBLE PRECISION NOT NULL       -- e.g. 0.10 = 10% off
);

CREATE TABLE IF NOT EXISTS quotes (
  id              SERIAL PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES products(id),
  user_id         INTEGER NOT NULL,
  applicant_name  TEXT NOT NULL,
  dob             DATE NOT NULL,               -- INSU-10: PII
  ssn             TEXT NOT NULL,               -- INSU-10: PII
  coverage_amount DOUBLE PRECISION NOT NULL,   -- INSU-05: never validated > 0
  age             INTEGER NOT NULL,
  smoker          BOOLEAN NOT NULL DEFAULT false,
  region          TEXT NOT NULL DEFAULT 'standard',  -- 'standard' | 'high'
  prior_claims    INTEGER NOT NULL DEFAULT 0,
  discount_pct    DOUBLE PRECISION NOT NULL DEFAULT 0,
  premium         DOUBLE PRECISION NOT NULL,   -- INSU-04: money as float
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
