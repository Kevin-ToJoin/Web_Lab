-- DevPortal Registration API — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. A signup / email-verification / login backend; the
-- interesting bugs are in the auth logic (see KNOWN_BUGS.md). The schema is
-- honest apart from the plaintext `password` column, which is the bug REGA-02.

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL,        -- REGA-01: uniqueness is checked case-sensitively
  username   TEXT NOT NULL,
  password   TEXT NOT NULL,        -- REGA-02: stored in plaintext (never hashed)
  age        INTEGER,
  phone      TEXT,
  zip        TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'verified'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false     -- REGA-10: set/checked? no.
);
