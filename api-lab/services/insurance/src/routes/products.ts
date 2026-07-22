import { Router } from 'express';
import { query } from '../db.js';

export const productsRouter = Router();

// GET /products — the insurance products with their base rates.
productsRouter.get('/', async (_req, res) => {
  const { rows } = await query(`SELECT id, name, base_rate FROM products ORDER BY id`);
  res.json(rows);
});
