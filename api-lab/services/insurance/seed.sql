-- SecureQuote (Insurance module) — seed data.
-- Inserted by src/initDb.ts only when the products table is empty.

INSERT INTO products (name, base_rate) VALUES
  ('Auto', 5.00),
  ('Home', 3.00),
  ('Life', 8.00);

INSERT INTO promos (code, discount_pct) VALUES
  ('LOYAL10',  0.10),
  ('BUNDLE15', 0.15),
  ('WELCOME20', 0.20),
  ('MEGA90',   0.90);   -- a legacy promo: stacking it exposes the missing clamp

-- One existing quote (for the admin-list and PII tests).
INSERT INTO quotes (product_id, user_id, applicant_name, dob, ssn, coverage_amount, age, smoker, region, prior_claims, discount_pct, premium) VALUES
  (1, 1, 'Alice Morgan', '1990-06-15', '555-11-2222', 20000, 34, false, 'standard', 0, 0.10, 90.00);
