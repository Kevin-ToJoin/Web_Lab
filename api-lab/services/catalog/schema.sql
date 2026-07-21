-- TechMart Catalog API — schema (DDL only, idempotent).
-- Applied by the API itself on startup (see src/initDb.ts), so the published
-- image is self-contained: no mounted files, no psql, no \connect needed.
-- Seed data lives in seed.sql and is inserted only when the tables are empty.

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_name  TEXT NOT NULL,
  rating     INTEGER NOT NULL,      -- should be 1..5; POST doesn't enforce it (CATA-09)
  comment    TEXT NOT NULL,         -- stored raw and served back (CATA-10)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
