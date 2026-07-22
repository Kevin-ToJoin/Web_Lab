import { Router } from 'express';
import { query } from '../db.js';

export const quotesRouter = Router();

// POST /quotes { product_id, user_id, applicant_name, dob, ssn, coverage_amount,
//                age, smoker, region, prior_claims, promo_codes }
// The rating engine — a cluster of injected bugs:
//   INSU-01: young-driver band uses age <= 25 (should be < 25).
//   INSU-03: risk loadings are summed instead of multiplied.
//   INSU-05: coverage_amount is never validated positive.
//   INSU-06: `if (smoker)` truthy-checks, so the string "false" applies the loading.
//   INSU-07: no-claims discount uses prior_claims <= 1 (should be === 0).
//   INSU-12: the high-risk-region loading is gated on product name 'Auto'.
//   INSU-02: the total discount is not clamped → premium can go negative.
//   INSU-04: all money math is float.
quotesRouter.post('/', async (req, res) => {
  const {
    product_id, user_id, applicant_name, dob, ssn, coverage_amount,
    age, smoker, region = 'standard', prior_claims = 0, promo_codes = [],
  } = req.body ?? {};

  const prod = await query<{ name: string; base_rate: number }>(
    `SELECT name, base_rate FROM products WHERE id = $1`, [product_id],
  );
  if (!prod.rows[0]) return res.status(404).json({ error: 'product not found' });
  const product = prod.rows[0];

  // INSU-05: no `if (coverage_amount <= 0) 400`.
  const base = Number(product.base_rate) * (Number(coverage_amount) / 1000);

  // INSU-01: should be age < 25.
  const ageMult = Number(age) <= 25 ? 1.5 : Number(age) >= 60 ? 1.8 : 1.0;

  // INSU-06: truthy check — "false" (string) is truthy.
  const smokerSur = smoker ? 0.3 : 0;
  // INSU-12: region loading only applied to Auto.
  const regionSur = region === 'high' && product.name === 'Auto' ? 0.2 : 0;
  const claimsSur = Number(prior_claims) * 0.1;
  // INSU-03: summed instead of (1+s)*(1+r)*(1+c).
  const riskMult = 1 + smokerSur + regionSur + claimsSur;

  const premiumBeforeDiscount = base * ageMult * riskMult; // INSU-04: float

  // INSU-07: should be prior_claims === 0.
  const noClaimsDiscount = Number(prior_claims) <= 1 ? 0.1 : 0;
  let promoDiscount = 0;
  if (Array.isArray(promo_codes) && promo_codes.length > 0) {
    const promos = await query<{ discount_pct: number }>(
      `SELECT discount_pct FROM promos WHERE code = ANY($1)`, [promo_codes],
    );
    promoDiscount = promos.rows.reduce((s, p) => s + Number(p.discount_pct), 0);
  }
  // INSU-02: totalDiscount is never clamped (can exceed 1 → negative premium).
  const totalDiscount = noClaimsDiscount + promoDiscount;
  const premium = premiumBeforeDiscount * (1 - totalDiscount);

  const { rows } = await query(
    `INSERT INTO quotes (product_id, user_id, applicant_name, dob, ssn, coverage_amount,
                         age, smoker, region, prior_claims, discount_pct, premium)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id, product_id, user_id, applicant_name, coverage_amount, age, region, premium, discount_pct`,
    [product_id, user_id, applicant_name, dob, ssn, coverage_amount,
     age, !!smokerSur, region, prior_claims, totalDiscount, premium],
  );
  res.status(201).json({ ...rows[0], riskMult, ageMult, premiumBeforeDiscount });
});

// GET /quotes/:id — INSU-08 (missing → 200 null) + INSU-10 (returns ssn/dob).
quotesRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, product_id, user_id, applicant_name, dob, ssn, coverage_amount,
            age, smoker, region, prior_claims, discount_pct, premium
     FROM quotes WHERE id = $1`,
    [Number(req.params.id)],
  );
  // INSU-08: rows[0] is undefined for a missing id → serialized as null, 200.
  res.json(rows[0] ?? null);
});
