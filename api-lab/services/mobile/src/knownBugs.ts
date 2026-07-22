// MobiTap (Mobile Wallet module) — the answer key. Every intentionally injected
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
  area: 'HTTP / Contract' | 'Money' | 'Concurrency' | 'Limits' | 'Security';
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
    id: 'WALL-01', title: 'A payment without sufficient balance drives the wallet negative',
    area: 'Money', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'POST /wallets/2/pay for more than the wallet balance',
    expected: '400 — insufficient funds',
    actual: 'The payment goes through and the balance goes negative',
    fix: 'Reject when amount > balance.',
  },
  {
    id: 'WALL-02', title: 'Balances stored/summed as float — money drifts by cents',
    area: 'Money', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Pay 0.10 several times and read the balance',
    expected: 'Exact-to-the-cent balances',
    actual: 'DOUBLE PRECISION accumulation yields values like 119.69999999999999',
    fix: 'Use NUMERIC(12,2) (or integer cents) for money.',
  },
  {
    id: 'WALL-03', title: 'Concurrent taps race — the balance is double-spent (no lock)',
    area: 'Concurrency', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'Fire several /pay requests for the same wallet at the same instant',
    expected: 'Payments serialize and the balance stays correct',
    actual: 'They all read the same balance and all succeed → the wallet overspends',
    fix: 'SELECT ... FOR UPDATE the wallet inside a transaction (or an atomic guarded UPDATE).',
  },
  {
    id: 'WALL-04', title: 'A negative payment amount is accepted — it credits the wallet',
    area: 'Money', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /wallets/1/pay with amount -50',
    expected: '400 — amount must be positive',
    actual: 'balance -= (-50) adds 50 to the wallet',
    fix: 'Require amount to be > 0.',
  },
  {
    id: 'WALL-05', title: 'The idempotency key is ignored — a retried tap charges twice',
    area: 'Money', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /wallets/1/pay twice with the same idem_key',
    expected: 'The second call is a no-op returning the first payment',
    actual: 'Both payments post — idem_key is neither unique nor checked',
    fix: 'Make idem_key unique per wallet and return the existing transaction on a repeat.',
  },
  {
    id: 'WALL-06', title: 'The daily spending limit is not enforced',
    area: 'Limits', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Make payments today that sum beyond the wallet daily_limit',
    expected: '400 once the day’s payments would exceed daily_limit',
    actual: 'There is no daily-total check — spending is unlimited',
    fix: 'Sum today’s payments and reject when they would exceed daily_limit.',
  },
  {
    id: 'WALL-07', title: 'No PIN is required above the contactless limit',
    area: 'Security', testType: 'Functional', characteristic: 'Security',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'POST /wallets/1/pay with amount 100 (over the $50 contactless limit) and no/blank pin',
    expected: 'A correct PIN is required once the amount exceeds the contactless limit',
    actual: 'The PIN is never checked, so large payments go through with no verification',
    fix: 'Require and verify the PIN when amount > the contactless limit.',
  },
  {
    id: 'WALL-08', title: 'A missing transaction returns 200 with null instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /transactions/9999',
    expected: '404 Not Found',
    actual: '200 OK with a null body',
    fix: 'Return 404 when no transaction row is found.',
  },
  {
    id: 'WALL-09', title: 'Malformed body returns a 500 HTML stack trace instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /wallets/1/pay with a truncated / invalid JSON body',
    expected: '400 Bad Request with a clean JSON error',
    actual: '500 text/html with a raw stack trace (internals leaked)',
    fix: 'Handle parse/validation errors as 400 with a JSON envelope.',
  },
  {
    id: 'WALL-10', title: 'PII leak / IDOR — GET /wallets/:id returns the full card number (PAN)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /wallets/1 with any (or no) X-User-Id',
    expected: 'Only the owner may read the wallet; the PAN must be masked (last 4)',
    actual: 'Any caller gets the full PAN — no ownership check, no masking',
    fix: 'Enforce ownership (X-User-Id vs user_id) and return only the masked PAN.',
  },
  {
    id: 'WALL-11', title: '/admin/wallets has no authorization and exposes every card number',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/wallets with no admin credentials',
    expected: '403 unless the caller is an admin; PANs never exposed',
    actual: 'Returns all wallets including full PANs, no authorization',
    fix: 'Require an admin role and mask the PAN.',
  },
  {
    id: 'WALL-12', title: 'A payment can be reversed twice — the refund double-credits',
    area: 'Money', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /transactions/1/reverse twice',
    expected: 'A transaction can be reversed once (409 on the second)',
    actual: 'The reversed flag is never set/checked, so the amount is refunded twice',
    fix: 'Mark the transaction reversed on first refund and reject a second reverse.',
  },
];
