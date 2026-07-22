-- VaultAuth (Auth module) — seed data.
-- Inserted by src/initDb.ts only when the users table is empty.

INSERT INTO users (email, password, mfa_enabled, mfa_code, failed_logins) VALUES
  ('alice@vault.io', 'S3cret!', true,  '042519', 0),   -- MFA on; code has a leading zero
  ('bob@vault.io',   'hunter2', false, NULL,     0);

-- An EXPIRED session (AUTH-03 accepts it) and a NOT-MFA-PASSED session for an
-- MFA-enabled user (AUTH-12 lets it through). Both belong to alice (user 1).
INSERT INTO sessions (user_id, token, expires_at, mfa_passed, revoked) VALUES
  (1, 'EXPIRED-TOKEN', now() - interval '2 days', true,  false),
  (1, 'NOMFA-TOKEN',   now() + interval '1 day',  false, false);

-- A reset code for bob (AUTH-08 lets it be reused).
INSERT INTO reset_codes (code, user_id, expires_at, used) VALUES
  ('RESET1', 2, now() + interval '1 hour', false);
