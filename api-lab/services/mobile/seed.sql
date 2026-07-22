-- MobiTap (Mobile Wallet module) — seed data.
-- Inserted by src/initDb.ts only when the wallets table is empty.

INSERT INTO wallets (user_id, holder, pan, pin, balance, daily_limit) VALUES
  (1, 'Alice Morgan', '4111-1111-1111-1111', '1234', 120.00, 300),
  (2, 'Bob Carter',   '5500-0000-0000-0004', '4321',  15.50, 100);

-- One completed payment (for the reversal test WALL-12 and the tx-lookup test).
INSERT INTO transactions (wallet_id, kind, amount, merchant) VALUES
  (1, 'payment', 20.00, 'Corner Coffee');
