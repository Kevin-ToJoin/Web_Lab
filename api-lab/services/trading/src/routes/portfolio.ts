import { Router } from 'express';
import { query } from '../db.js';

export const portfolioRouter = Router();

// GET /accounts/:id/portfolio — cash + positions valued at the live price.
//   TRAD-03: totals are summed in float, so they drift by fractions of a cent.
//   TRAD-07: unrealized P&L uses avg_cost, which the buy path corrupts (it stores
//            the last fill price rather than the weighted average), so P&L is wrong.
portfolioRouter.get('/:id/portfolio', async (req, res) => {
  const id = Number(req.params.id);
  const acct = await query<{ cash: number }>(`SELECT cash FROM accounts WHERE id = $1`, [id]);
  if (!acct.rows[0]) return res.status(404).json({ error: 'account not found' });

  const positions = await query<{ symbol: string; quantity: number; avg_cost: number; price: number }>(
    `SELECT p.symbol, p.quantity, p.avg_cost, i.price
     FROM positions p JOIN instruments i ON i.symbol = p.symbol
     WHERE p.account_id = $1 ORDER BY p.symbol`,
    [id],
  );

  let holdingsValue = 0; // TRAD-03: float accumulation.
  const rows = positions.rows.map(p => {
    const marketValue = p.quantity * p.price;
    holdingsValue += marketValue;
    return {
      symbol: p.symbol,
      quantity: p.quantity,
      avgCost: p.avg_cost,                             // TRAD-07: corrupted upstream
      price: p.price,
      marketValue,
      unrealizedPnl: (p.price - p.avg_cost) * p.quantity, // TRAD-07 surfaces here
    };
  });

  const cash = Number(acct.rows[0].cash);
  res.json({
    accountId: id,
    cash,
    holdingsValue,
    totalValue: cash + holdingsValue, // TRAD-03: float
    positions: rows,
  });
});
