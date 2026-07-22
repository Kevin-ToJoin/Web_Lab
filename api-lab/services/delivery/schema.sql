-- QuickBite (Delivery module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. Deliberate gaps used as QA bugs:
--   DELV-04  money columns are DOUBLE PRECISION (float) → total/tip drift
--   DELV-07  free-delivery threshold is applied with > instead of >=

CREATE TABLE IF NOT EXISTS restaurants (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  min_order       DOUBLE PRECISION NOT NULL DEFAULT 0,  -- DELV-02: never enforced
  open_hour       INTEGER NOT NULL DEFAULT 9,           -- DELV-03: hours never checked
  close_hour      INTEGER NOT NULL DEFAULT 22,
  max_distance_km DOUBLE PRECISION NOT NULL DEFAULT 8,  -- DELV-01: zone never checked
  delivery_fee    DOUBLE PRECISION NOT NULL DEFAULT 4.99
);

CREATE TABLE IF NOT EXISTS promos (
  code      TEXT PRIMARY KEY,
  discount  DOUBLE PRECISION NOT NULL,
  stackable BOOLEAN NOT NULL DEFAULT false  -- DELV-05: the flag is ignored
);

CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  restaurant_id    INTEGER NOT NULL REFERENCES restaurants(id),
  user_id          INTEGER NOT NULL,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,             -- DELV-11: PII, leaked by GET /orders/:id
  customer_address TEXT NOT NULL,             -- DELV-11: PII
  distance_km      DOUBLE PRECISION NOT NULL,
  subtotal         DOUBLE PRECISION NOT NULL,
  discount         DOUBLE PRECISION NOT NULL DEFAULT 0,
  delivery_fee     DOUBLE PRECISION NOT NULL DEFAULT 0,
  tip              DOUBLE PRECISION NOT NULL DEFAULT 0,
  total            DOUBLE PRECISION NOT NULL,  -- DELV-04: money as float
  status           TEXT NOT NULL DEFAULT 'placed',  -- 'placed' | 'delivered' | 'cancelled'
  placed_at        TIMESTAMP NOT NULL DEFAULT now()
);
