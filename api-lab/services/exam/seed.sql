-- CertifyHub (Exam module) — seed data.
-- Inserted by src/initDb.ts only when the exams table is empty.

-- One exam: pass at 60%, negative marking on (0.25 per wrong), 30 min, 2 attempts.
INSERT INTO exams (title, pass_pct, negative, penalty, duration_min, max_attempts) VALUES
  ('ISTQB Foundation — Practice', 60, true, 0.25, 30, 2);

-- 5 questions, each with 4 options. correct_index is 0-based.
INSERT INTO questions (exam_id, prompt, correct_index, num_options) VALUES
  (1, 'Testing shows the presence of…?', 0, 4),
  (1, 'A test case includes…?',          2, 4),
  (1, 'Boundary value analysis targets…?', 1, 4),
  (1, 'A defect is…?',                    3, 4),
  (1, 'Equivalence partitioning reduces…?', 1, 4);

-- A second exam WITHOUT negative marking — makes the pass-cutoff boundary clean:
-- 5 questions, pass 60%, so exactly 3 correct = 60% (should pass; EXAM-01 fails it).
INSERT INTO exams (title, pass_pct, negative, penalty, duration_min, max_attempts) VALUES
  ('Agile Basics — Practice', 60, false, 0, 20, 3);

INSERT INTO questions (exam_id, prompt, correct_index, num_options) VALUES
  (2, 'A sprint is…?',            0, 4),
  (2, 'The Product Owner…?',      0, 4),
  (2, 'A retrospective is…?',     0, 4),
  (2, 'Velocity measures…?',      0, 4),
  (2, 'The Daily Scrum is…?',     0, 4);

-- One completed attempt (for the admin-results test).
INSERT INTO attempts (exam_id, user_id, started_at, score, percentage, passed) VALUES
  (1, 1, now() - interval '1 hour', 4, 80, true);
