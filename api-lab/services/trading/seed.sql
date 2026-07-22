-- Trading Desk (Trading module) — seed data.
-- Inserted by src/initDb.ts only when the instruments table is empty.

INSERT INTO instruments (symbol, name, price) VALUES
  ('AAPL', 'Apple Inc.',        189.90),
  ('TSLA', 'Tesla Inc.',        251.05),
  ('BOND', 'TreasuryPlus ETF',   99.99),
  ('PENNY','MicroCap Corp.',      0.10);   -- cheap: exposes float/precision drift

INSERT INTO accounts (owner, user_id, cash) VALUES
  ('Alice Morgan', 1, 10000.00),
  ('Bob Carter',   2, 250.00);

-- Alice already holds 10 AAPL bought at 150.00 (weighted-avg cost basis test).
INSERT INTO positions (account_id, symbol, quantity, avg_cost) VALUES
  (1, 'AAPL', 10, 150.00);
