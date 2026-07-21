import { Router } from 'express';
import { query, pool } from '../db.js';

export const productsRouter = Router();

// GET /products?search=&limit= — two injected bugs:
//   BUG-API-06: `limit` is not capped, so ?limit=1000000 dumps the whole table.
//   BUG-DB-04: `search` is concatenated straight into SQL (injection).
productsRouter.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  // BUG-API-06: no Math.min clamp on the page size.
  const limit = Number(req.query.limit) || 20;

  if (search) {
    // BUG-DB-04: string-concatenated query — `' OR '1'='1` changes the logic.
    const sql = `SELECT id, name, price, stock FROM products WHERE name ILIKE '%${search}%' LIMIT ${limit}`;
    const { rows } = await pool.query(sql);
    return res.json(rows);
  }

  const { rows } = await query(`SELECT id, name, price, stock FROM products LIMIT $1`, [limit]);
  res.json(rows);
});

// GET /products/:id — BUG-API-01: a missing product returns 200 with a null
// body instead of a 404.
productsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, price, stock FROM products WHERE id = $1`,
    [Number(req.params.id)],
  );
  // BUG-API-01: rows[0] is undefined for a missing id; JSON-serialized as null,
  // still with a 200 status.
  res.json(rows[0] ?? null);
});
