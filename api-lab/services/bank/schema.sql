-- Vault Online (Bank module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained: a pre-built image + a plain Postgres is enough.
--
-- Deliberate integrity gaps used as QA bugs:
--   BANK-04  accounts.balance is DOUBLE PRECISION (float) → cent rounding drift
--   BANK-05  transfers.idem_key is NOT UNIQUE → no idempotency

CREATE TABLE IF NOT EXISTS accounts (
  id         SERIAL PRIMARY KEY,
  number     TEXT NOT NULL,
  owner      TEXT NOT NULL,
  user_id    INTEGER NOT NULL,               -- the customer who owns this account
  balance    DOUBLE PRECISION NOT NULL DEFAULT 0,  -- BANK-04: money as float
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id         SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  kind       TEXT NOT NULL,                  -- 'debit' | 'credit'
  amount     DOUBLE PRECISION NOT NULL,
  ref        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfers (
  id         SERIAL PRIMARY KEY,
  from_id    INTEGER NOT NULL,
  to_id      INTEGER NOT NULL,
  amount     DOUBLE PRECISION NOT NULL,
  idem_key   TEXT,                           -- BANK-05: not UNIQUE → duplicates
  status     TEXT NOT NULL DEFAULT 'posted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The statement's opening balance is hardcoded and never recomputed from the
-- ledger, so the printed closing balance can drift from reality (BANK-09).
CREATE TABLE IF NOT EXISTS statement_meta (
  account_id      INTEGER PRIMARY KEY REFERENCES accounts(id),
  opening_balance DOUBLE PRECISION NOT NULL
);
