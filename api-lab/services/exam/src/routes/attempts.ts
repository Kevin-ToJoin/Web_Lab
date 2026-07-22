import { Router } from 'express';
import { query } from '../db.js';

// submitRouter is mounted at /exams (only POST /:id/submit); attemptsRouter is
// mounted at /attempts (only GET /:id). Kept separate so GET /exams/:id resolves
// to the exams router, not to an attempt lookup.
export const submitRouter = Router();
export const attemptsRouter = Router();

interface Exam { id: number; pass_pct: number; negative: boolean; penalty: number; duration_min: number; max_attempts: number }
interface Question { id: number; correct_index: number; num_options: number }

// POST /exams/:id/submit { user_id, started_at, answers: { "<questionId>": index } }
// A cluster of injected bugs:
//   EXAM-04: no check that the submission is within duration_min of started_at.
//   EXAM-05: no check against max_attempts.
//   EXAM-07: no validation that an answer index is within [0, num_options).
//   EXAM-03: negative marking penalizes blanks as well as wrong answers.
//   EXAM-11: the score is not clamped to >= 0.
//   EXAM-02: the percentage is floored.
//   EXAM-01: passed uses > instead of >=.
//   EXAM-10: every call inserts a new attempt (no idempotency).
submitRouter.post('/:id/submit', async (req, res) => {
  const examId = Number(req.params.id);
  const { user_id, started_at, answers = {} } = req.body ?? {};

  const ex = await query<Exam>(
    `SELECT id, pass_pct, negative, penalty, duration_min, max_attempts FROM exams WHERE id = $1`,
    [examId],
  );
  if (!ex.rows[0]) return res.status(404).json({ error: 'exam not found' });
  const exam = ex.rows[0];

  // EXAM-05 (max_attempts) and EXAM-04 (deadline) checks are simply absent.

  const qs = await query<Question>(
    `SELECT id, correct_index, num_options FROM questions WHERE exam_id = $1 ORDER BY id`,
    [examId],
  );
  const total = qs.rows.length;

  let correct = 0, wrong = 0, blank = 0;
  for (const q of qs.rows) {
    const a = answers[String(q.id)];
    // EXAM-07: `a` is never range-checked against q.num_options.
    if (a === undefined || a === null) blank++;
    else if (Number(a) === q.correct_index) correct++;
    else wrong++;
  }

  // EXAM-03: the penalty multiplies (wrong + blank), punishing skipped questions.
  const penalized = exam.negative ? exam.penalty * (wrong + blank) : 0;
  // EXAM-11: no Math.max(0, ...) clamp — the score can go negative.
  const score = correct - penalized;
  // EXAM-02: floored instead of rounded.
  const percentage = total > 0 ? Math.floor((score / total) * 100) : 0;
  // EXAM-01: should be >=.
  const passed = percentage > exam.pass_pct;

  // EXAM-10: a fresh attempt row on every submission (no de-duplication).
  const { rows } = await query(
    `INSERT INTO attempts (exam_id, user_id, started_at, score, percentage, passed)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, exam_id, user_id, started_at, submitted_at, score, percentage, passed`,
    [examId, user_id, started_at ?? null, score, percentage, passed],
  );
  res.status(201).json({ ...rows[0], correct, wrong, blank, total });
});

// GET /attempts/:id — EXAM-08: a missing attempt returns 200 + null instead of 404.
attemptsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, exam_id, user_id, started_at, submitted_at, score, percentage, passed
     FROM attempts WHERE id = $1`,
    [Number(req.params.id)],
  );
  res.json(rows[0] ?? null);
});
