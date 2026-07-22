// QuickBite (Delivery module) — the answer key. Every intentionally injected
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
  area: 'HTTP / Contract' | 'Zones' | 'Pricing' | 'Time' | 'Security';
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
    id: 'DELV-01', title: 'Delivery outside the zone (beyond max distance) is accepted',
    area: 'Zones', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /orders with distance_km greater than the restaurant max_distance_km',
    expected: '400 — the address is outside the delivery zone',
    actual: 'The order is placed regardless of distance',
    fix: 'Reject when distance_km > restaurant.max_distance_km.',
  },
  {
    id: 'DELV-02', title: 'Order below the minimum is accepted',
    area: 'Pricing', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /orders with subtotal below the restaurant min_order',
    expected: '400 — order does not meet the minimum',
    actual: 'The under-minimum order is placed',
    fix: 'Reject when subtotal < restaurant.min_order.',
  },
  {
    id: 'DELV-03', title: 'Orders outside operating hours are accepted',
    area: 'Time', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /orders with placed_at at 03:00 (restaurant open 11–22)',
    expected: '400 — the restaurant is closed at that time',
    actual: 'The order is placed; operating hours are never checked',
    fix: 'Reject when the order hour is outside [open_hour, close_hour).',
  },
  {
    id: 'DELV-04', title: 'Money stored/summed as float — totals and tips drift by cents',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Place an order and inspect subtotal/tip/total arithmetic',
    expected: 'Exact-to-the-cent money math',
    actual: 'DOUBLE PRECISION math produces values like 32.200000000000003',
    fix: 'Use NUMERIC(10,2) (or integer cents) for money.',
  },
  {
    id: 'DELV-05', title: 'Non-stackable promos stack — every code discounts the order',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Decision Table', testLevel: 'Integration',
    repro: 'POST /orders with promo_codes ["SAVE5","WELCOME","FRIENDS"] (all non-stackable)',
    expected: 'At most one non-stackable promo applies',
    actual: 'The discounts are all summed — the "stackable" flag is ignored',
    fix: 'Only apply one non-stackable promo (or check the stackable flag).',
  },
  {
    id: 'DELV-06', title: 'Tip is computed on the wrong base and a negative tip is accepted',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'POST /orders with tip_pct 20 (then try tip_pct -50)',
    expected: 'Tip is a non-negative percentage of the FOOD subtotal',
    actual: 'Tip is a percentage of (subtotal + delivery fee), and negative tip_pct reduces the total',
    fix: 'Compute tip on the food subtotal only and clamp tip_pct to >= 0.',
  },
  {
    id: 'DELV-07', title: 'Free-delivery threshold uses > instead of >= (boundary)',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'Place an order with subtotal exactly 25.00 (free-delivery threshold)',
    expected: 'Free delivery at exactly the threshold (>=)',
    actual: 'Uses subtotal > 25, so at exactly 25.00 the delivery fee is still charged',
    fix: 'Use >= at the free-delivery threshold.',
  },
  {
    id: 'DELV-08', title: 'Missing order returns 200 with null instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /orders/9999',
    expected: '404 Not Found',
    actual: '200 OK with a null body',
    fix: 'Return 404 when no order row is found.',
  },
  {
    id: 'DELV-09', title: 'Malformed body returns a 500 HTML stack trace instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /orders with a truncated / invalid JSON body',
    expected: '400 Bad Request with a clean JSON error',
    actual: '500 text/html with a raw stack trace (internals leaked)',
    fix: 'Handle parse/validation errors as 400 with a JSON envelope.',
  },
  {
    id: 'DELV-10', title: 'A delivered order can still be cancelled (illegal state transition)',
    area: 'Time', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /orders/1/cancel on the seeded already-delivered order',
    expected: '409 — only a placed order may be cancelled',
    actual: 'The status is overwritten to cancelled from any state',
    fix: 'Guard the transition: only placed → cancelled is allowed.',
  },
  {
    id: 'DELV-11', title: 'PII leak / IDOR — GET /orders/:id returns the customer phone & address',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /orders/1 with any (or no) X-User-Id',
    expected: 'Only the owner may read the order; customer PII is not exposed to others',
    actual: 'Any caller gets phone and address — no ownership check, no field stripping',
    fix: 'Enforce ownership (X-User-Id vs user_id) and avoid returning PII to non-owners.',
  },
  {
    id: 'DELV-12', title: '/admin/orders has no authorization and exposes every order (with PII)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/orders with no admin credentials',
    expected: '403 unless the caller is an admin',
    actual: 'Returns all orders including customer phone/address, no authorization',
    fix: 'Require an admin role and strip PII from the response.',
  },
];
