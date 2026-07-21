import { Router } from 'express';
import { query } from '../db.js';

export const accountsRouter = Router();

// GET /accounts/:id — two injected bugs:
//   BANK-06: IDOR — no ownership check, so any account is readable.
//   BANK-10: a missing account returns 200 with a null body instead of 404.
accountsRouter.get('/:id', async (req, res) => {
  // BANK-06: the caller's X-User-Id is never compared to the row's user_id.
  const { rows } = await query(
    `SELECT id, number, owner, user_id, balance FROM accounts WHERE id = $1`,
    [Number(req.params.id)],
  );
  // BANK-10: rows[0] is undefined for a missing id → serialized as null, 200.
  res.json(rows[0] ?? null);
});

// GET /accounts/:id/transactions — the ledger for an account.
accountsRouter.get('/:id/transactions', async (req, res) => {
  const { rows } = await query(
    `SELECT id, kind, amount, ref, created_at FROM transactions
     WHERE account_id = $1 ORDER BY id`,
    [Number(req.params.id)],
  );
  res.json(rows);
});

// GET /accounts/:id/statement — BANK-09: the closing balance is computed from a
// hardcoded opening balance, so it never reconciles with the live account.
accountsRouter.get('/:id/statement', async (req, res) => {
  const id = Number(req.params.id);
  const meta = await query<{ opening_balance: number }>(
    `SELECT opening_balance FROM statement_meta WHERE account_id = $1`,
    [id],
  );
  const opening = meta.rows[0]?.opening_balance ?? 0;

  const totals = await query<{ credits: number; debits: number }>(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE kind = 'credit'), 0) AS credits,
       COALESCE(SUM(amount) FILTER (WHERE kind = 'debit'),  0) AS debits
     FROM transactions WHERE account_id = $1`,
    [id],
  );
  const { credits, debits } = totals.rows[0];

  const live = await query<{ balance: number }>(
    `SELECT balance FROM accounts WHERE id = $1`, [id],
  );

  // BANK-09: closing = stale opening + net movement; compare against live balance.
  const closing = opening + Number(credits) - Number(debits);
  res.json({
    accountId: id,
    openingBalance: opening,
    totalCredits: Number(credits),
    totalDebits: Number(debits),
    computedClosing: closing,
    liveBalance: live.rows[0]?.balance ?? null,
    note: 'computedClosing should equal liveBalance — does it?',
  });
});
