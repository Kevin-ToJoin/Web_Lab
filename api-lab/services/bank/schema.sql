\connect bank

-- Vault Online (Bank module) — schema + seed.
-- Deliberate integrity gaps used as QA bugs:
--   BANK-04  accounts.balance is DOUBLE PRECISION (float) → cent rounding drift
--   BANK-05  transfers.idem_key is NOT UNIQUE → no idempotency
-- (The application layer injects the rest — see KNOWN_BUGS.md.)

CREATE TABLE accounts (
  id         SERIAL PRIMARY KEY,
  number     TEXT NOT NULL,
  owner      TEXT NOT NULL,
  user_id    INTEGER NOT NULL,               -- the customer who owns this account
  balance    DOUBLE PRECISION NOT NULL DEFAULT 0,  -- BANK-04: money as float
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id         SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  kind       TEXT NOT NULL,                  -- 'debit' | 'credit'
  amount     DOUBLE PRECISION NOT NULL,
  ref        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transfers (
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
CREATE TABLE statement_meta (
  account_id      INTEGER PRIMARY KEY REFERENCES accounts(id),
  opening_balance DOUBLE PRECISION NOT NULL
);

-- ─── Seed ────────────────────────────────────────────────────────────────
INSERT INTO accounts (number, owner, user_id, balance) VALUES
  ('1001-2002-3003', 'Alice Morgan', 1, 1500.00),
  ('1001-2002-9999', 'Alice Morgan', 1, 320.50),
  ('4004-5005-6006', 'Bob Carter',   2, 8750.25),
  ('7007-8008-9009', 'Carol Diaz',   3, 42.00);

INSERT INTO transactions (account_id, kind, amount, ref) VALUES
  (1, 'credit', 2000.00, 'Payroll deposit'),
  (1, 'debit',   500.00, 'Rent payment');

-- BANK-09: opening balance recorded as 1000.00 while the account really began
-- elsewhere — opening + credits − debits will NOT equal the live balance.
INSERT INTO statement_meta (account_id, opening_balance) VALUES (1, 1000.00);
