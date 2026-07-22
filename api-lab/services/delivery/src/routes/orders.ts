import { Router } from 'express';
import { query } from '../db.js';

export const ordersRouter = Router();

const FREE_DELIVERY_THRESHOLD = 25;

// POST /orders { restaurant_id, user_id, customer_name, customer_phone,
//                customer_address, distance_km, subtotal, promo_codes[], tip_pct, placed_at? }
// A cluster of injected bugs:
//   DELV-01: distance_km is never checked against the restaurant zone.
//   DELV-02: subtotal is never checked against min_order.
//   DELV-03: the order hour is never checked against operating hours.
//   DELV-04: money is float.
//   DELV-05: non-stackable promos all stack (the stackable flag is ignored).
//   DELV-06: tip uses (subtotal + fee) as its base and negative tip_pct is allowed.
//   DELV-07: free delivery uses > instead of >= at the threshold.
ordersRouter.post('/', async (req, res) => {
  const {
    restaurant_id, user_id, customer_name, customer_phone, customer_address,
    distance_km, subtotal, promo_codes = [], tip_pct = 0, placed_at,
  } = req.body ?? {};

  const rst = await query<{ min_order: number; open_hour: number; close_hour: number; max_distance_km: number; delivery_fee: number }>(
    `SELECT min_order, open_hour, close_hour, max_distance_km, delivery_fee FROM restaurants WHERE id = $1`,
    [restaurant_id],
  );
  if (!rst.rows[0]) return res.status(404).json({ error: 'restaurant not found' });
  const r = rst.rows[0];

  // DELV-01 / DELV-02 / DELV-03: none of these guards exist.

  // DELV-05: sum EVERY provided promo's discount, ignoring the stackable flag.
  let discount = 0;
  if (Array.isArray(promo_codes) && promo_codes.length > 0) {
    const promos = await query<{ discount: number }>(
      `SELECT discount FROM promos WHERE code = ANY($1)`, [promo_codes],
    );
    discount = promos.rows.reduce((s, p) => s + Number(p.discount), 0);
  }

  // DELV-07: should be subtotal >= FREE_DELIVERY_THRESHOLD.
  const deliveryFee = Number(subtotal) > FREE_DELIVERY_THRESHOLD ? 0 : Number(r.delivery_fee);

  // DELV-06: tip base includes the delivery fee (should be the food subtotal),
  // and tip_pct is not clamped, so a negative percentage lowers the total.
  const tip = (Number(subtotal) + deliveryFee) * (Number(tip_pct) / 100);

  // DELV-04: float arithmetic.
  const total = Number(subtotal) - discount + deliveryFee + tip;

  const { rows } = await query(
    `INSERT INTO orders (restaurant_id, user_id, customer_name, customer_phone, customer_address,
                         distance_km, subtotal, discount, delivery_fee, tip, total, placed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE($12, now()))
     RETURNING id, restaurant_id, user_id, customer_name, distance_km, subtotal, discount,
               delivery_fee, tip, total, status, placed_at`,
    [restaurant_id, user_id, customer_name, customer_phone, customer_address,
     distance_km, subtotal, discount, deliveryFee, tip, total, placed_at ?? null],
  );
  res.status(201).json(rows[0]);
});

// GET /orders/:id — DELV-08 (missing → 200 null) + DELV-11 (returns phone/address,
// no ownership check).
ordersRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, restaurant_id, user_id, customer_name, customer_phone, customer_address,
            distance_km, subtotal, discount, delivery_fee, tip, total, status, placed_at
     FROM orders WHERE id = $1`,
    [Number(req.params.id)],
  );
  // DELV-08: rows[0] is undefined for a missing id → serialized as null, 200.
  res.json(rows[0] ?? null);
});

// POST /orders/:id/cancel — DELV-10: no state-transition guard, so a 'delivered'
// (or already 'cancelled') order is happily "cancelled".
ordersRouter.post('/:id/cancel', async (req, res) => {
  const { rows } = await query(
    `UPDATE orders SET status = 'cancelled' WHERE id = $1 RETURNING id, status`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'order not found' });
  res.json(rows[0]);
});
