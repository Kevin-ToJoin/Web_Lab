import { Router } from 'express';
import { query, pool } from '../db.js';

export const productsRouter = Router();

// GET /products?category=&search=&sort=&page=&limit=&expand=reviews
// Carries most of the catalog bugs:
//   CATA-01: the "Home Goods" filter wrongly also returns Electronics.
//   CATA-02: search uses LIKE (case-sensitive) instead of ILIKE.
//   CATA-03: the `total` count ignores the active filters.
//   CATA-04: a page beyond the last returns the last page instead of empty.
//   CATA-05: a page <= 0 produces a negative OFFSET → unhandled 500.
//   CATA-06: the `sort` param is concatenated into ORDER BY (SQL injection).
//   CATA-13: expand=reviews issues one query per product (N+1).
productsRouter.get('/', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const offset = (page - 1) * limit;              // CATA-05: page 0 → offset < 0
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const sort = (req.query.sort as string) || 'id'; // CATA-06: raw into ORDER BY

  const where: string[] = [];
  const params: unknown[] = [];
  if (category) {
    if (category === 'Home Goods') {
      // CATA-01: spurious extra branch drags Electronics into Home Goods.
      params.push(category);
      where.push(`(category = $${params.length} OR category = 'Electronics')`);
    } else {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
  }
  if (search) {
    // CATA-02: LIKE is case-sensitive — "headphones" won't match "Headphones".
    params.push(`%${search}%`);
    where.push(`name LIKE $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // CATA-06: `sort` is interpolated, not bound — try ?sort=price;DROP...
  // CATA-05: limit/offset interpolated raw — a negative offset 500s.
  const listSql = `SELECT id, name, category, price, stock FROM products
                   ${whereSql} ORDER BY ${sort} LIMIT ${limit} OFFSET ${offset}`;
  let { rows } = await pool.query(listSql, params);

  // CATA-04: instead of an empty page past the end, silently serve the last one.
  if (rows.length === 0 && page > 1) {
    const last = await pool.query(
      `SELECT id, name, category, price, stock FROM products ${whereSql}
       ORDER BY ${sort} LIMIT ${limit} OFFSET GREATEST(0, (SELECT count(*) FROM products) - ${limit})`,
      params,
    );
    rows = last.rows;
  }

  // CATA-13: N+1 — a query per product when expanding reviews.
  if (req.query.expand === 'reviews') {
    for (const p of rows as Array<Record<string, unknown>>) {
      const r = await query(`SELECT id, rating, comment FROM reviews WHERE product_id = $1`, [p.id]);
      p.reviews = r.rows;
    }
  }

  // CATA-03: total counts the whole table, ignoring category/search filters.
  const totalRes = await query<{ total: number }>(`SELECT count(*)::int AS total FROM products`);

  res.json({ page, limit, total: totalRes.rows[0].total, items: rows });
});

// GET /products/:id — two injected bugs:
//   CATA-11: a non-numeric id (Number(...) → NaN) reaches SQL → unhandled 500.
//   CATA-12: a missing (but numeric) id silently returns product #1, not 404.
productsRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id); // CATA-11: 'abc' → NaN → integer compare 500
  const { rows } = await query(
    `SELECT id, name, category, price, stock, description FROM products WHERE id = $1`,
    [id],
  );
  if (!rows[0]) {
    // CATA-12: fallback to the first product instead of returning 404.
    const fb = await query(
      `SELECT id, name, category, price, stock, description FROM products WHERE id = 1`,
    );
    return res.json(fb.rows[0] ?? null);
  }
  res.json(rows[0]);
});
