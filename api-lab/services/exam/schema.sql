-- CertifyHub (Exam module) — schema (DDL only; seed lives in seed.sql).
-- Applied on startup by src/initDb.ts (idempotent), so the image is
-- self-contained. Deliberate gaps used as QA bugs:
--   EXAM-06  questions.correct_index is exposed by GET /exams/:id/questions
--   EXAM-02  scores/percentages are DOUBLE PRECISION and floored on output

CREATE TABLE IF NOT EXISTS exams (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  pass_pct     DOUBLE PRECISION NOT NULL DEFAULT 60,  -- EXAM-01: cutoff (uses > not >=)
  negative     BOOLEAN NOT NULL DEFAULT false,        -- negative marking on?
  penalty      DOUBLE PRECISION NOT NULL DEFAULT 0,   -- points removed per wrong
  duration_min INTEGER NOT NULL DEFAULT 30,           -- EXAM-04: never enforced
  max_attempts INTEGER NOT NULL DEFAULT 1             -- EXAM-05: never enforced
);

CREATE TABLE IF NOT EXISTS questions (
  id            SERIAL PRIMARY KEY,
  exam_id       INTEGER NOT NULL REFERENCES exams(id),
  prompt        TEXT NOT NULL,
  correct_index INTEGER NOT NULL,   -- EXAM-06: leaked by the questions endpoint
  num_options   INTEGER NOT NULL    -- EXAM-07: answer index never range-checked
);

CREATE TABLE IF NOT EXISTS attempts (
  id           SERIAL PRIMARY KEY,
  exam_id      INTEGER NOT NULL REFERENCES exams(id),
  user_id      INTEGER NOT NULL,
  started_at   TIMESTAMP,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score        DOUBLE PRECISION NOT NULL,      -- EXAM-11: not clamped >= 0
  percentage   DOUBLE PRECISION NOT NULL,      -- EXAM-02: floored
  passed       BOOLEAN NOT NULL
);
