import { Router } from 'express';
import { query } from '../db.js';

export const patientsRouter = Router();

// GET /patients/:id — two injected bugs:
//   HLTH-05: PHI leak / IDOR — no ownership check, and ssn is returned.
//   HLTH-08: a missing patient returns 200 with a null body instead of 404.
patientsRouter.get('/:id', async (req, res) => {
  // HLTH-05: the caller's X-User-Id is never compared to the row's user_id,
  // and the SELECT includes ssn, which is sent straight to the client.
  const { rows } = await query(
    `SELECT id, name, dob, plan_tier, member_id, ssn, user_id, deductible_met
     FROM patients WHERE id = $1`,
    [Number(req.params.id)],
  );
  // HLTH-08: rows[0] is undefined for a missing id → serialized as null, 200.
  res.json(rows[0] ?? null);
});

// GET /patients/:id/vitals — the patient's recorded vitals (most recent first).
patientsRouter.get('/:id/vitals', async (req, res) => {
  const { rows } = await query(
    `SELECT id, recorded_at, systolic, diastolic, heart_rate, temp_c
     FROM vitals WHERE patient_id = $1 ORDER BY recorded_at DESC`,
    [Number(req.params.id)],
  );
  res.json(rows);
});
