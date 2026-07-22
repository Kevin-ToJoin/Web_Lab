import { Router } from 'express';
import { query } from '../db.js';

export const roomsRouter = Router();

// GET /rooms — the room inventory with nightly rates.
roomsRouter.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, number, type, capacity, nightly_rate FROM rooms ORDER BY id`,
  );
  res.json(rows);
});

// GET /rooms/:id
roomsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, number, type, capacity, nightly_rate FROM rooms WHERE id = $1`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'room not found' });
  res.json(rows[0]);
});
