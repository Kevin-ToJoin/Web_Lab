import { Router } from 'express';
import { query } from '../db.js';

export const vitalsRouter = Router();

// POST /vitals { patient_id, systolic, diastolic, heart_rate, temp_c }
//   HLTH-06: no physiological range validation — impossible vitals (e.g.
//   systolic 9999, heart_rate -5) are stored as-is.
vitalsRouter.post('/', async (req, res) => {
  const { patient_id, systolic, diastolic, heart_rate, temp_c } = req.body ?? {};
  // A real portal validates ranges here (systolic 50–300, diastolic 30–200,
  // heart_rate 20–250, temp_c 30–45). This one does not.
  const { rows } = await query(
    `INSERT INTO vitals (patient_id, systolic, diastolic, heart_rate, temp_c)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, patient_id, recorded_at, systolic, diastolic, heart_rate, temp_c`,
    [patient_id, systolic, diastolic, heart_rate, temp_c],
  );
  res.status(201).json(rows[0]);
});
