-- DevPortal Registration API — seed data.
-- Inserted by src/initDb.ts only when the users table is empty.

-- A verified user (target for uniqueness / enumeration tests).
INSERT INTO users (email, username, password, age, status)
  VALUES ('alice@dev.io', 'alice', 'Sup3rSecret!', 34, 'verified');

-- A pending user whose code is '042519' and ALREADY EXPIRED — exercises the
-- leading-zero comparison (REGA-05) and the missing expiry check (REGA-06).
INSERT INTO users (email, username, password, age, status)
  VALUES ('bob@dev.io', 'bob', 'hunter2', 27, 'pending');
INSERT INTO verification_codes (user_id, code, expires_at)
  VALUES (2, '042519', now() - interval '1 day');
