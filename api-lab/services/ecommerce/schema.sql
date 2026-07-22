-- OrderFlow API (Ecommerce module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. This schema deliberately ships with integrity gaps used as
-- QA bugs:
--   BUG-DB-01  users.email has NO UNIQUE constraint  → duplicate signups
--   BUG-DB-02  order_items.product_id has NO FOREIGN KEY → orphan rows survive
--   BUG-DB-06  products.price is DOUBLE PRECISION (float) → cent rounding drift

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,               -- BUG-DB-01: should be UNIQUE
  password_hash TEXT NOT NULL,               -- BUG-SEC-02: leaked by /admin/users
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  price    DOUBLE PRECISION NOT NULL,        -- BUG-DB-06: money as float
  stock    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  status     TEXT NOT NULL DEFAULT 'pending',
  total      DOUBLE PRECISION NOT NULL DEFAULT 0,
  idem_key   TEXT,                           -- BUG-API-08: not UNIQUE → no idempotency
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL,               -- BUG-DB-02: no FK to products(id)
  quantity   INTEGER NOT NULL,
  unit_price DOUBLE PRECISION NOT NULL
);

-- Tracks processed jobs so the worker COULD be idempotent — but the worker
-- never reads it (BUG-Q-01). Left here so the fix is one line away.
CREATE TABLE IF NOT EXISTS processed_jobs (
  job_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
