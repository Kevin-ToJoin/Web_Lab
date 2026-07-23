-- MobiTap (Mobile Wallet module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. Deliberate gaps used as QA bugs:
--   WALL-02  balance / amount are DOUBLE PRECISION (float) → balance drift
--   WALL-10  wallets.pan (card number) is PII, leaked by GET /wallets/:id

CREATE TABLE IF NOT EXISTS wallets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  holder      TEXT NOT NULL,
  pan         TEXT NOT NULL,                  -- WALL-10: full card number (PII)
  pin         TEXT NOT NULL,                  -- WALL-07: required over the contactless limit
  balance     DOUBLE PRECISION NOT NULL DEFAULT 0,   -- WALL-02: money as float
  daily_limit DOUBLE PRECISION NOT NULL DEFAULT 300, -- WALL-06: never enforced
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id         SERIAL PRIMARY KEY,
  wallet_id  INTEGER NOT NULL REFERENCES wallets(id),
  kind       TEXT NOT NULL,                   -- 'payment' | 'topup' | 'reversal'
  amount     DOUBLE PRECISION NOT NULL,
  merchant   TEXT,
  idem_key   TEXT,                            -- WALL-05: not UNIQUE / never checked
  reversed   BOOLEAN NOT NULL DEFAULT false,  -- WALL-12: never set/checked on reverse
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
