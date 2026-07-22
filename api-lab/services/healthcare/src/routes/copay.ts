import { Router } from 'express';
import { query } from '../db.js';

export const copayRouter = Router();

// Plan decision table: deductible + copay before/after the deductible is met.
const PLANS: Record<string, { deductible: number; preCopay: number; postCopay: number }> = {
  Bronze: { deductible: 2000, preCopay: 90, postCopay: 40 },
  Silver: { deductible: 1500, preCopay: 70, postCopay: 30 },
  Gold:   { deductible: 1000, preCopay: 50, postCopay: 20 },
};

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// POST /copay/estimate
//   { patient_id }                              → use the stored patient, or
//   { plan_tier, deductible_met, dob }          → a what-if estimate
// Injected bugs:
//   HLTH-03: "deductible met" uses > (strict) instead of >=, so a patient at
//            exactly the deductible is charged the pre-deductible (higher) copay.
//   HLTH-04: pediatric uses age <= 18 instead of age < 18, so an 18-year-old is
//            priced as a child.
copayRouter.post('/estimate', async (req, res) => {
  const body = req.body ?? {};
  let planTier: string, deductibleMet: number, dob: string;

  if (body.patient_id != null) {
    const { rows } = await query<{ plan_tier: string; deductible_met: number; dob: string }>(
      `SELECT plan_tier, deductible_met, dob FROM patients WHERE id = $1`,
      [Number(body.patient_id)],
    );
    if (!rows[0]) return res.status(404).json({ error: 'patient not found' });
    planTier = rows[0].plan_tier;
    deductibleMet = Number(rows[0].deductible_met);
    dob = String(rows[0].dob);
  } else {
    planTier = String(body.plan_tier);
    deductibleMet = Number(body.deductible_met);
    dob = String(body.dob);
  }

  const plan = PLANS[planTier];
  if (!plan) return res.status(400).json({ error: `unknown plan tier: ${planTier}` });

  const age = ageFromDob(dob);

  // HLTH-03: should be deductibleMet >= plan.deductible.
  const deductibleIsMet = deductibleMet > plan.deductible;
  let copay = deductibleIsMet ? plan.postCopay : plan.preCopay;

  // HLTH-04: pediatric should be age < 18. Using <= 18 misprices 18-year-olds.
  const pediatric = age <= 18;
  if (pediatric) copay = Math.round(copay * 0.5 * 100) / 100;

  res.json({
    planTier, age, pediatric,
    deductible: plan.deductible,
    deductibleMet,
    deductibleIsMet,
    copay,
  });
});
