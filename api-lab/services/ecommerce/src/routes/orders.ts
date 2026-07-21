import { Router } from 'express';
import { query } from '../db.js';
import { fulfillmentQueue } from '../queue.js';

export const ordersRouter = Router();

interface OrderItemInput {
  productId: number;
  quantity: number;
}

// POST /orders — the richest endpoint, carrying several injected bugs:
//   BUG-API-02: a malformed `items` (not an array) throws → unhandled 500.
//   BUG-API-03: success returns 200 (not 201) and no Location header.
//   BUG-API-08: the Idempotency-Key header is stored but never checked.
//   BUG-DB-03: inserts are not wrapped in a transaction → partial writes.
//   BUG-DB-05: stock is read-then-written with no lock → oversell under load.
//   BUG-DB-06: the total accumulates as a float and is stored in a float column.
ordersRouter.post('/', async (req, res) => {
  const userId = Number(req.header('x-user-id')) || 1;
  const body = req.body ?? {};

  // BUG-Q-02: a poison order enqueues a job the worker can never process.
  const poison = body.poison === true;

  // BUG-API-02: no shape validation — `.map` on a non-array throws and the
  // error surfaces as a raw 500.
  const items: OrderItemInput[] = body.items;

  // BUG-API-08: read the idempotency key but never look up an existing order.
  const idemKey = req.header('idempotency-key') ?? null;

  // BUG-DB-03: order row is created before items are validated; there is no
  // surrounding transaction, so a later failure leaves this row orphaned.
  const { rows: orderRows } = await query<{ id: number }>(
    `INSERT INTO orders (user_id, status, idem_key) VALUES ($1, 'pending', $2) RETURNING id`,
    [userId, idemKey],
  );
  const orderId = orderRows[0].id;

  let total = 0; // BUG-DB-06: float accumulation.
  let flakeOnce = false;

  for (const item of items) {
    const { rows: prodRows } = await query<{ id: number; price: number; stock: number }>(
      `SELECT id, price, stock FROM products WHERE id = $1`,
      [item.productId],
    );
    const product = prodRows[0];
    if (!product) {
      // BUG-DB-03: throwing here leaves the order (and any earlier items) behind.
      throw new Error(`product ${item.productId} not found`);
    }
    if (product.stock < item.quantity) {
      throw new Error(`product ${item.productId} is out of stock`);
    }

    await query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)`,
      [orderId, product.id, item.quantity, product.price],
    );
    // BUG-DB-05: no SELECT … FOR UPDATE / atomic guard — concurrent orders race.
    await query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [item.quantity, product.id]);

    total += product.price * item.quantity;
    if (product.id === 4) flakeOnce = true; // the grinder's job flakes once (BUG-Q-01).
  }

  await query(`UPDATE orders SET status = 'paid', total = $1 WHERE id = $2`, [total, orderId]);

  await fulfillmentQueue.add(
    'fulfill',
    { orderId, email: `user${userId}@shop.io`, total, flakeOnce, poison },
    { attempts: 5, backoff: { type: 'fixed', delay: 1000 } },
  );

  // BUG-API-03: 200 instead of 201, and no Location header.
  res.json({ id: orderId, status: 'paid', total });
});

// GET /orders/:id — BUG-SEC-01: IDOR. Any caller can read any order; the
// handler never checks the order's user_id against the authenticated user.
ordersRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT id, user_id, status, total, created_at FROM orders WHERE id = $1`,
    [Number(req.params.id)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'order not found' });
  res.json(rows[0]);
});
