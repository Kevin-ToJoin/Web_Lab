-- Vault Online (Bank module) — seed data.
-- Inserted by src/initDb.ts only when the accounts table is empty.

INSERT INTO accounts (number, owner, user_id, balance) VALUES
  ('1001-2002-3003', 'Alice Morgan', 1, 1500.00),
  ('1001-2002-9999', 'Alice Morgan', 1, 320.50),
  ('4004-5005-6006', 'Bob Carter',   2, 8750.25),
  ('7007-8008-9009', 'Carol Diaz',   3, 42.00);

INSERT INTO transactions (account_id, kind, amount, ref) VALUES
  (1, 'credit', 2000.00, 'Payroll deposit'),
  (1, 'debit',   500.00, 'Rent payment');

-- BANK-09: opening balance recorded as 1000.00 while the account really began
-- elsewhere — opening + credits − debits will NOT equal the live balance.
INSERT INTO statement_meta (account_id, opening_balance) VALUES (1, 1000.00);
