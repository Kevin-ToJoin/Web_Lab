import { Router } from 'express';
import { query } from '../db.js';

export const instrumentsRouter = Router();

// GET /instruments — the tradable universe with current prices.
instrumentsRouter.get('/', async (_req, res) => {
  const { rows } = await query(`SELECT symbol, name, price FROM instruments ORDER BY symbol`);
  res.json(rows);
});

// GET /instruments/:symbol
instrumentsRouter.get('/:symbol', async (req, res) => {
  const { rows } = await query(
    `SELECT symbol, name, price FROM instruments WHERE symbol = $1`,
    [String(req.params.symbol).toUpperCase()],
  );
  if (!rows[0]) return res.status(404).json({ error: 'instrument not found' });
  res.json(rows[0]);
});
