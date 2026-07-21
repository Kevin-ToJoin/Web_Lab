\connect catalog

-- TechMart Catalog API — schema + seed. A read-heavy product/search/reviews
-- backend. Most bugs live in the query layer (see KNOWN_BUGS.md); the schema is
-- mostly honest here.

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE reviews (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_name  TEXT NOT NULL,
  rating     INTEGER NOT NULL,      -- should be 1..5; POST doesn't enforce it (CATA-09)
  comment    TEXT NOT NULL,         -- stored raw and served back (CATA-10)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Seed ────────────────────────────────────────────────────────────────
INSERT INTO products (name, category, price, stock, description) VALUES
  ('4K Smart TV',            'Electronics', 599.99, 50, 'Stunning 4K resolution.'),
  ('Noise-Cancelling Headphones', 'Electronics', 249.50, 15, 'Industry-leading ANC.'),
  ('Ergonomic Office Chair', 'Home Goods',  199.00,  0, 'Supportive for long hours.'),
  ('Cotton T-Shirt',         'Apparel',      15.00, 500, 'Basic cotton tee.'),
  ('Wireless Mouse',         'Electronics',  25.00,  45, 'Ergonomic wireless mouse.'),
  ('Ceramic Coffee Mug',     'Home Goods',   12.50, 100, 'Minimalist ceramic mug.'),
  ('Laptop Backpack',        'Accessories',  45.00,  60, 'Water-resistant backpack.'),
  ('Gaming Monitor',         'Electronics',  349.99, 20, '144Hz curved monitor.');

-- Reviews: product 1 has several; product 2 has NONE (used to expose CATA-07,
-- where fetching product 2's reviews wrongly returns product 1's).
INSERT INTO reviews (product_id, user_name, rating, comment) VALUES
  (1, 'JohnD',     5, 'Great TV!'),
  (1, 'MariaK',    4, 'Excellent picture, pricey.'),
  (3, 'JaneSmith', 4, 'Comfortable but hard to assemble.'),
  (5, 'DevOnPC',   5, 'Perfect mouse.');
