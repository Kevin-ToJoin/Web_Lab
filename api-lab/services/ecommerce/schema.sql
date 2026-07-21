\connect ecommerce

-- OrderFlow API (Ecommerce module) — schema + seed.
-- This schema deliberately ships with integrity gaps used as QA bugs:
--   BUG-DB-01  users.email has NO UNIQUE constraint  → duplicate signups
--   BUG-DB-02  order_items.product_id has NO FOREIGN KEY → orphan rows survive
--   BUG-DB-06  products.price is DOUBLE PRECISION (float) → cent rounding drift
-- (The application layer injects the rest — see KNOWN_BUGS.md.)

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,               -- BUG-DB-01: should be UNIQUE
  password_hash TEXT NOT NULL,               -- BUG-SEC-02: leaked by /admin/users
  role          TEXT NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  price    DOUBLE PRECISION NOT NULL,        -- BUG-DB-06: money as float
  stock    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  status     TEXT NOT NULL DEFAULT 'pending',
  total      DOUBLE PRECISION NOT NULL DEFAULT 0,
  idem_key   TEXT,                           -- BUG-API-08: not UNIQUE → no idempotency
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL,               -- BUG-DB-02: no FK to products(id)
  quantity   INTEGER NOT NULL,
  unit_price DOUBLE PRECISION NOT NULL
);

-- Tracks processed jobs so the worker COULD be idempotent — but the worker
-- never reads it (BUG-Q-01). Left here so the fix is one line away.
CREATE TABLE processed_jobs (
  job_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Seed ────────────────────────────────────────────────────────────────
INSERT INTO users (email, password_hash, role) VALUES
  ('alice@shop.io',  'sha256:pw_alice',  'customer'),
  ('bob@shop.io',    'sha256:pw_bob',    'customer'),
  ('admin@shop.io',  'sha256:pw_admin',  'admin');

INSERT INTO products (name, price, stock) VALUES
  ('Premium Coffee Beans', 24.99, 5),
  ('Ceramic Mug',          12.50, 3),
  ('Pour-over Maker',      35.00, 0),   -- out of stock
  ('Electric Grinder',     75.00, 2);

-- A pre-existing orphan: order_items row pointing at a product that never
-- existed (id 999). BUG-DB-02 lets this survive — a data-integrity catch.
INSERT INTO orders (user_id, status, total) VALUES (1, 'paid', 49.98);
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  VALUES (1, 999, 2, 24.99);
