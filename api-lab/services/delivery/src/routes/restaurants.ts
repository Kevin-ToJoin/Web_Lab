import { Router } from 'express';
import { query } from '../db.js';

export const restaurantsRouter = Router();

// GET /restaurants — the directory with minimums, hours, zone and fee.
restaurantsRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, name, min_order, open_hour, close_hour, max_distance_km, delivery_fee
     FROM restaurants ORDER BY id`,
  );
  res.json(rows);
});

// GET /restaurants/:id
restaurantsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, min_order, open_hour, close_hour, max_distance_km, delivery_fee
     FROM restaurants WHERE id = $1`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'restaurant not found' });
  res.json(rows[0]);
});
