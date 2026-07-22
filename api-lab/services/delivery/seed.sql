-- QuickBite (Delivery module) — seed data.
-- Inserted by src/initDb.ts only when the restaurants table is empty.

INSERT INTO restaurants (name, min_order, open_hour, close_hour, max_distance_km, delivery_fee) VALUES
  ('Noodle House',  15.00, 11, 22, 8,  4.99),
  ('Pizza Planet',  20.00, 10, 23, 10, 3.99),
  ('Green Bowl',    12.00,  9, 21, 5,  5.49);

-- Promos. None are stackable — but the order path ignores the flag (DELV-05).
INSERT INTO promos (code, discount, stackable) VALUES
  ('SAVE5',    5.00, false),
  ('WELCOME',  8.00, false),
  ('FRIENDS',  3.00, false);

-- One already-delivered order (for the illegal cancel-transition test, DELV-10).
INSERT INTO orders (restaurant_id, user_id, customer_name, customer_phone, customer_address, distance_km, subtotal, delivery_fee, tip, total, status) VALUES
  (1, 1, 'Alice Morgan', '555-0100', '12 Maple St', 3.2, 28.00, 0.00, 4.20, 32.20, 'delivered');
