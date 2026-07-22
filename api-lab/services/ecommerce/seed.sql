-- OrderFlow API (Ecommerce module) — seed data.
-- Inserted by src/initDb.ts only when the products table is empty.

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
