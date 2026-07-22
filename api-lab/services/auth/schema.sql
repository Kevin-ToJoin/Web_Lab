-- VaultAuth (Auth module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. Deliberate gaps used as QA bugs:
--   AUTH-05  users.password is PLAINTEXT (never hashed)
--   AUTH-02  users.failed_logins is tracked but never triggers a lockout

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  password      TEXT NOT NULL,                 -- AUTH-05: plaintext
  mfa_enabled   BOOLEAN NOT NULL DEFAULT false,
  mfa_code      TEXT,                          -- fixed OTP for the lab (e.g. '042519')
  failed_logins INTEGER NOT NULL DEFAULT 0,    -- AUTH-02: counted, never enforced
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,             -- AUTH-03: never checked on /me
  mfa_passed BOOLEAN NOT NULL DEFAULT false,   -- AUTH-12: never required on /me
  revoked    BOOLEAN NOT NULL DEFAULT false    -- AUTH-07: logout never sets this
);

CREATE TABLE IF NOT EXISTS reset_codes (
  code       TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false    -- AUTH-08: never set/checked
);
