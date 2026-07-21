import { Router } from 'express';
import { query } from '../db.js';

// Mounted at /products/:id/reviews
export const reviewsRouter = Router({ mergeParams: true });

// GET /products/:id/reviews — two injected bugs:
//   CATA-07: if the product has no reviews, product #1's reviews are returned
//            instead — so a product wrongly shows another product's feedback.
//   CATA-08: the average rating is computed with integer division, dropping the
//            fractional part (4.5 shows as 4).
reviewsRouter.get('/', async (req, res) => {
  const productId = Number((req.params as { id: string }).id);
  let { rows } = await query<{ id: number; user_name: string; rating: number; comment: string }>(
    `SELECT id, user_name, rating, comment, created_at FROM reviews WHERE product_id = $1 ORDER BY id`,
    [productId],
  );

  // CATA-07: silent fallback to product 1's reviews when this product has none.
  if (rows.length === 0) {
    const fb = await query<{ id: number; user_name: string; rating: number; comment: string }>(
      `SELECT id, user_name, rating, comment, created_at FROM reviews WHERE product_id = 1 ORDER BY id`,
    );
    rows = fb.rows;
  }

  // CATA-08: integer division — Math.floor drops the decimal (4.5 → 4).
  const sum = rows.reduce((a, r) => a + r.rating, 0);
  const averageRating = rows.length ? Math.floor(sum / rows.length) : 0;

  res.json({ productId, averageRating, count: rows.length, reviews: rows });
});

// POST /products/:id/reviews — two injected bugs:
//   CATA-09: `rating` is not validated, so 0 or 6 (outside 1..5) is accepted.
//   CATA-10: `comment` is stored and later served back raw (no sanitization),
//            a stored-XSS vector when the frontend renders it.
reviewsRouter.post('/', async (req, res) => {
  const productId = Number((req.params as { id: string }).id);
  const { userName, rating, comment } = req.body ?? {};

  // CATA-09: no `1 <= rating <= 5` check. CATA-10: comment stored verbatim.
  const { rows } = await query(
    `INSERT INTO reviews (product_id, user_name, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_name, rating, comment, created_at`,
    [productId, userName ?? 'anonymous', rating, comment ?? ''],
  );
  res.status(201).json(rows[0]);
});
