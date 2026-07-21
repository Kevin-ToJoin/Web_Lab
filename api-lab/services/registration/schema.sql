\connect registration

-- DevPortal Registration API — schema + seed. A signup / email-verification /
-- login backend. The interesting bugs are in the auth logic (see KNOWN_BUGS.md);
-- the schema is honest apart from the plaintext `password` column, which is
-- itself the bug REGA-02.

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL,        -- REGA-01: uniqueness is checked case-sensitively
  username   TEXT NOT NULL,
  password   TEXT NOT NULL,        -- REGA-02: stored in plaintext (never hashed)
  age        INTEGER,
  phone      TEXT,
  zip        TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'verified'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE verification_codes (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false     -- REGA-10: set/checked? no.
);

-- ─── Seed ────────────────────────────────────────────────────────────────
-- A verified user (target for uniqueness / enumeration tests).
INSERT INTO users (email, username, password, age, status)
  VALUES ('alice@dev.io', 'alice', 'Sup3rSecret!', 34, 'verified');

-- A pending user whose code is '042519' and ALREADY EXPIRED — exercises the
-- leading-zero comparison (REGA-05) and the missing expiry check (REGA-06).
INSERT INTO users (email, username, password, age, status)
  VALUES ('bob@dev.io', 'bob', 'hunter2', 27, 'pending');
INSERT INTO verification_codes (user_id, code, expires_at)
  VALUES (2, '042519', now() - interval '1 day');
