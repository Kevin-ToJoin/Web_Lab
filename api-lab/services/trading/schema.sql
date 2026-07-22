-- Trading Desk (Trading module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. Deliberate gaps used as QA bugs:
--   TRAD-03  cash / price / avg_cost are DOUBLE PRECISION (float) → P&L drift
--   TRAD-08  orders.client_order_id is NOT UNIQUE → duplicate submissions
--   TRAD-09  orders.created_at is TIMESTAMP (no time zone) → market-day drift

CREATE TABLE IF NOT EXISTS accounts (
  id       SERIAL PRIMARY KEY,
  owner    TEXT NOT NULL,
  user_id  INTEGER NOT NULL,
  cash     DOUBLE PRECISION NOT NULL DEFAULT 0   -- TRAD-03: money as float
);

CREATE TABLE IF NOT EXISTS instruments (
  symbol TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  price  DOUBLE PRECISION NOT NULL               -- TRAD-03 / TRAD-06: last price
);

CREATE TABLE IF NOT EXISTS positions (
  id         SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  symbol     TEXT NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 0,
  avg_cost   DOUBLE PRECISION NOT NULL DEFAULT 0  -- TRAD-07: weighted-average cost basis
);

CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  account_id      INTEGER NOT NULL REFERENCES accounts(id),
  symbol          TEXT NOT NULL,
  side            TEXT NOT NULL,                  -- 'buy' | 'sell'
  type            TEXT NOT NULL DEFAULT 'market', -- 'market' | 'limit'
  quantity        INTEGER NOT NULL,
  limit_price     DOUBLE PRECISION,
  filled_price    DOUBLE PRECISION,
  status          TEXT NOT NULL DEFAULT 'filled',
  client_order_id TEXT,                           -- TRAD-08: not UNIQUE → duplicates
  created_at      TIMESTAMP NOT NULL DEFAULT now() -- TRAD-09: no time zone
);
