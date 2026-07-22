import { Router } from 'express';
import { query } from '../db.js';

export const examsRouter = Router();

// GET /exams — the exam catalogue.
examsRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, title, pass_pct, negative, penalty, duration_min, max_attempts
     FROM exams ORDER BY id`,
  );
  res.json(rows);
});

// GET /exams/:id
examsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, title, pass_pct, negative, penalty, duration_min, max_attempts
     FROM exams WHERE id = $1`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'exam not found' });
  res.json(rows[0]);
});

// GET /exams/:id/questions — EXAM-06: this leaks correct_index. A candidate can
// GET the questions and read the answer key before submitting.
examsRouter.get('/:id/questions', async (req, res) => {
  const { rows } = await query(
    `SELECT id, prompt, num_options, correct_index   -- EXAM-06: correct_index must NOT be returned
     FROM questions WHERE exam_id = $1 ORDER BY id`,
    [Number(req.params.id)],
  );
  res.json(rows);
});
