import { Router } from 'express';
import { query } from '../db.js';

export const ordersRouter = Router();

// POST /orders { account_id, symbol, side, quantity, type?, price?, client_order_id? }
// A dense cluster of injected bugs — this is the "impossible" module:
//   TRAD-01: no buying-power check (cash can go negative).
//   TRAD-02: reads cash then updates without a lock/transaction (race → double-spend).
//   TRAD-04: a sell isn't checked against the held quantity (position goes negative).
//   TRAD-05: quantity isn't validated positive.
//   TRAD-06: a market order trusts a client-supplied price instead of the live quote.
//   TRAD-07: avg_cost is overwritten with the fill price, not the weighted average.
//   TRAD-08: client_order_id is not checked for duplicates.
ordersRouter.post('/', async (req, res) => {
  const { account_id, symbol, side, quantity, type = 'market', price, client_order_id } = req.body ?? {};
  const qty = Number(quantity); // TRAD-05: never checked to be a positive integer.

  const inst = await query<{ price: number }>(
    `SELECT price FROM instruments WHERE symbol = $1`, [symbol],
  );
  const livePrice = Number(inst.rows[0]?.price ?? 0);
  // TRAD-06: a market order should ALWAYS fill at livePrice; here a body price wins.
  const fillPrice = price != null ? Number(price) : livePrice;
  const cost = qty * fillPrice; // TRAD-03: float math.

  // TRAD-02: cash is read here and updated below with no row lock and no
  // transaction, so two concurrent orders both see the same cash.
  const acct = await query<{ cash: number }>(`SELECT cash FROM accounts WHERE id = $1`, [account_id]);
  if (!acct.rows[0]) return res.status(404).json({ error: 'account not found' });

  if (side === 'buy') {
    // TRAD-01: no `if (cost > cash) return 400`. The cash is just debited.
    await query(`UPDATE accounts SET cash = cash - $1 WHERE id = $2`, [cost, account_id]);
    const pos = await query<{ id: number }>(
      `SELECT id FROM positions WHERE account_id = $1 AND symbol = $2`, [account_id, symbol],
    );
    if (pos.rows[0]) {
      // TRAD-07: avg_cost overwritten with the latest fill price (not weighted).
      await query(`UPDATE positions SET quantity = quantity + $1, avg_cost = $2 WHERE id = $3`,
        [qty, fillPrice, pos.rows[0].id]);
    } else {
      await query(`INSERT INTO positions (account_id, symbol, quantity, avg_cost) VALUES ($1,$2,$3,$4)`,
        [account_id, symbol, qty, fillPrice]);
    }
  } else {
    // TRAD-04: no check that the account actually holds >= qty shares.
    await query(`UPDATE accounts SET cash = cash + $1 WHERE id = $2`, [cost, account_id]);
    const pos = await query<{ id: number }>(
      `SELECT id FROM positions WHERE account_id = $1 AND symbol = $2`, [account_id, symbol],
    );
    if (pos.rows[0]) {
      await query(`UPDATE positions SET quantity = quantity - $1 WHERE id = $2`, [qty, pos.rows[0].id]);
    } else {
      await query(`INSERT INTO positions (account_id, symbol, quantity, avg_cost) VALUES ($1,$2,$3,$4)`,
        [account_id, symbol, -qty, fillPrice]);
    }
  }

  // TRAD-08: no lookup by client_order_id — a repeat just inserts another order.
  const { rows } = await query(
    `INSERT INTO orders (account_id, symbol, side, type, quantity, filled_price, client_order_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, account_id, symbol, side, type, quantity, filled_price, status, created_at`,
    [account_id, symbol, side, type, qty, fillPrice, client_order_id ?? null],
  );
  res.status(201).json(rows[0]);
});

// GET /orders/today — TRAD-09: created_at is a naive TIMESTAMP compared to the
// server's CURRENT_DATE, so a late order can land on the wrong trading day.
ordersRouter.get('/today', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, account_id, symbol, side, quantity, filled_price, created_at
     FROM orders WHERE created_at::date = CURRENT_DATE ORDER BY id`,
  );
  res.json(rows);
});

// GET /orders/:id — TRAD-10: a missing order returns 200 + null instead of 404.
ordersRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, account_id, symbol, side, type, quantity, filled_price, status, created_at
     FROM orders WHERE id = $1`,
    [Number(req.params.id)],
  );
  res.json(rows[0] ?? null);
});
