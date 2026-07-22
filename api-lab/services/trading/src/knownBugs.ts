// Trading Desk (Trading module) — the answer key. Every intentionally injected
// bug with its ISTQB classification. Served at GET /_lab/bugs?key=REVEAL.

export type TestType = 'Functional' | 'Non-functional';
export type TestDesign =
  | 'Boundary Value Analysis'
  | 'Equivalence Partitioning'
  | 'Decision Table'
  | 'State Transition'
  | 'Error Guessing'
  | 'Checklist / Heuristic'
  | 'Exploratory';
export type TestLevel = 'Component' | 'Integration' | 'System' | 'Contract';

export interface ApiBug {
  id: string;
  title: string;
  area: 'HTTP / Contract' | 'Database' | 'Money / Risk' | 'Concurrency' | 'Time' | 'Security';
  testType: TestType;
  characteristic: string;
  testDesign: TestDesign;
  testLevel: TestLevel;
  repro: string;
  expected: string;
  actual: string;
  fix: string;
}

export const KNOWN_BUGS: ApiBug[] = [
  {
    id: 'TRAD-01', title: 'Buy order does not check buying power — cash goes negative',
    area: 'Money / Risk', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'POST /orders buy 1000 AAPL from account 2 (which has $250)',
    expected: '400 — order rejected for insufficient buying power',
    actual: 'The order fills and cash goes negative',
    fix: 'Reject when quantity * fill price > available cash.',
  },
  {
    id: 'TRAD-02', title: 'Concurrent buys race — cash is double-spent (no lock / no transaction)',
    area: 'Concurrency', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'Fire two buy orders for the same account at the same instant (k6 / xargs -P)',
    expected: 'Balances stay correct — the two orders serialize',
    actual: 'Both read the same cash and both fill → the account spends more than it has',
    fix: 'SELECT ... FOR UPDATE the account row inside a transaction, or use an atomic UPDATE with a WHERE cash >= cost guard.',
  },
  {
    id: 'TRAD-03', title: 'Cash / prices stored as float — P&L and balances drift by cents',
    area: 'Money / Risk', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Buy 3 PENNY at 0.10 repeatedly and read the portfolio value',
    expected: 'Exact-to-the-cent money math',
    actual: 'DOUBLE PRECISION accumulation produces values like 0.30000000000000004',
    fix: 'Use NUMERIC(18,4) (or integer minor units) for money.',
  },
  {
    id: 'TRAD-04', title: 'Sell more shares than held — position goes negative',
    area: 'Money / Risk', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'POST /orders sell 9999 AAPL from account 1 (holds 10)',
    expected: '400 — cannot sell more than the held quantity (no naked short here)',
    actual: 'The sell fills and the position quantity goes negative',
    fix: 'Reject a sell whose quantity exceeds the current position.',
  },
  {
    id: 'TRAD-05', title: 'Order quantity not validated positive — a negative quantity flips the side',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /orders buy -5 AAPL',
    expected: '400 — quantity must be a positive integer',
    actual: 'A negative quantity is accepted and effectively reverses the trade / credits cash',
    fix: 'Require quantity to be an integer >= 1.',
  },
  {
    id: 'TRAD-06', title: 'Market order fills at a stale/spoofed price instead of the live quote',
    area: 'Money / Risk', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Integration',
    repro: 'POST /orders a market buy with a body price far below the instrument price',
    expected: 'A market order fills at the current instruments.price, ignoring any client-supplied price',
    actual: 'The handler trusts the price in the request body, so the client sets their own fill price',
    fix: 'For market orders, read the price from instruments server-side; ignore any body price.',
  },
  {
    id: 'TRAD-07', title: 'Cost basis uses the last fill price, not the weighted average',
    area: 'Money / Risk', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Checklist / Heuristic', testLevel: 'Integration',
    repro: 'Buy more AAPL at a new price, then GET the portfolio — check avg_cost / unrealized P&L',
    expected: 'avg_cost is the quantity-weighted average across all buys',
    actual: 'avg_cost is overwritten with the latest fill price, so unrealized P&L is wrong',
    fix: 'Recompute avg_cost = (old_qty*old_avg + fill_qty*fill_price) / (old_qty + fill_qty).',
  },
  {
    id: 'TRAD-08', title: 'Duplicate client_order_id submits the order twice (no idempotency)',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /orders twice with the same client_order_id',
    expected: 'The second call is a no-op returning the first order',
    actual: 'Two orders are created — client_order_id is neither unique nor checked',
    fix: 'Make client_order_id UNIQUE (and return the existing order on a repeat).',
  },
  {
    id: 'TRAD-09', title: 'Order timestamps have no time zone — the trading day drifts by locale',
    area: 'Time', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'Place an order near midnight, then GET /orders/today from another time zone',
    expected: 'An order maps to the same instant / trading day everywhere',
    actual: 'created_at is TIMESTAMP (no zone), so a late order can fall on the wrong day',
    fix: 'Store TIMESTAMPTZ and compute "today" against the exchange time zone.',
  },
  {
    id: 'TRAD-10', title: 'Missing order returns 200 with null instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /orders/999999',
    expected: '404 Not Found',
    actual: '200 OK with a null body',
    fix: 'Return 404 when no order row is found.',
  },
  {
    id: 'TRAD-11', title: 'Malformed order body returns a 500 HTML stack trace instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /orders with a truncated / invalid JSON body',
    expected: '400 Bad Request with a clean JSON error',
    actual: '500 text/html with a raw stack trace (internals leaked)',
    fix: 'Handle parse/validation errors as 400 with a JSON envelope.',
  },
  {
    id: 'TRAD-12', title: '/admin/orders has no authorization and exposes every account’s orders',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/orders with no admin credentials',
    expected: '403 unless the caller is an admin',
    actual: 'Returns all orders for all accounts, no authorization at all',
    fix: 'Require an admin role before returning the global order book.',
  },
];
