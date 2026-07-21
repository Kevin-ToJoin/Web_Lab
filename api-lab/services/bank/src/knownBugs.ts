// Vault Online (Bank module) — the answer key. Every intentionally injected
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
  area: 'HTTP / Contract' | 'Database' | 'Money / Ledger' | 'Security';
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
    id: 'BANK-01', title: 'Transfer is not transactional — a mid-way failure leaves money inconsistent',
    area: 'Money / Ledger', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Error Guessing', testLevel: 'Integration',
    repro: 'POST /transfers where the debit succeeds but the credit step then fails',
    expected: 'All-or-nothing: the whole transfer rolls back',
    actual: 'The source is debited and a transaction row is written, but the credit never lands — money vanishes',
    fix: 'Wrap debit + credit + both ledger rows in BEGIN/COMMIT with ROLLBACK on error.',
  },
  {
    id: 'BANK-02', title: 'No overdraft check — a transfer can drive the balance negative',
    area: 'Money / Ledger', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'POST /transfers for more than the source balance',
    expected: '422 Unprocessable — insufficient funds; balance never goes below 0',
    actual: 'The transfer posts and the source balance goes negative',
    fix: 'Reject when amount > balance before applying (ideally inside the locked transaction).',
  },
  {
    id: 'BANK-03', title: 'Concurrent transfers race — double-spend (no row lock)',
    area: 'Database', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'Fire many concurrent transfers from the same account (see load/k6-doublespend.js)',
    expected: 'Balance is read under SELECT … FOR UPDATE; only funds that exist can move',
    actual: 'Read-then-write with no lock lets concurrent transfers both pass — total money changes',
    fix: 'SELECT balance … FOR UPDATE inside a transaction, or an atomic guarded UPDATE.',
  },
  {
    id: 'BANK-04', title: 'Money stored as float — cent rounding drift',
    area: 'Money / Ledger', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Transfer amounts like 0.1 then 0.2 and inspect the balance',
    expected: 'Balances are exact to the cent',
    actual: 'DOUBLE PRECISION columns accumulate drift (…000000004)',
    fix: 'Store money as NUMERIC(14,2) or integer cents, not DOUBLE PRECISION.',
  },
  {
    id: 'BANK-05', title: 'Idempotency-Key ignored — a retried transfer posts twice',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /transfers twice with the same Idempotency-Key header',
    expected: 'The second call returns the first transfer; no second debit',
    actual: 'Two transfers post; the key is stored but never checked (and has no UNIQUE index)',
    fix: 'Add UNIQUE(idem_key) and return the existing transfer when the key repeats.',
  },
  {
    id: 'BANK-06', title: 'IDOR — any account balance is readable without an ownership check',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'As user 2 (X-User-Id: 2), GET /accounts/1 (Alice’s account)',
    expected: '403 Forbidden — you may only read your own accounts',
    actual: 'Any account is returned; user_id is never compared to the caller',
    fix: 'WHERE id = $1 AND user_id = $caller; 403/404 otherwise.',
  },
  {
    id: 'BANK-07', title: 'Non-positive transfer amount accepted (negative reverses direction)',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /transfers with amount -100',
    expected: '400 Bad Request — amount must be positive',
    actual: 'A negative amount is applied, effectively pulling money the other way',
    fix: 'Reject amount <= 0 before processing.',
  },
  {
    id: 'BANK-08', title: 'Transfer to a nonexistent account silently destroys funds',
    area: 'Money / Ledger', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Error Guessing', testLevel: 'Integration',
    repro: 'POST /transfers to a toId that does not exist (e.g. 9999)',
    expected: '404/422 and no change to any balance',
    actual: 'The source is debited; the credit lands nowhere — total money in the bank drops',
    fix: 'Verify the destination account exists (and lock it) before debiting the source.',
  },
  {
    id: 'BANK-09', title: 'Statement closing balance does not reconcile with the ledger',
    area: 'Money / Ledger', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Checklist / Heuristic', testLevel: 'Integration',
    repro: 'GET /accounts/1/statement — compare closing vs the live balance from GET /accounts/1',
    expected: 'opening + credits − debits == the account’s live balance',
    actual: 'opening_balance is a hardcoded 1000.00; the computed closing disagrees with reality',
    fix: 'Derive the opening balance from the prior period’s closing so the books reconcile.',
  },
  {
    id: 'BANK-10', title: 'Missing account returns 200 with null body instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /accounts/9999',
    expected: '404 Not Found',
    actual: '200 OK with body null',
    fix: 'Return 404 when the account row is missing.',
  },
  {
    id: 'BANK-11', title: 'Malformed transfer payload returns 500 instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /transfers with body { "amount": "lots" }',
    expected: '400 Bad Request describing the validation failure',
    actual: '500 Internal Server Error (unhandled — a stack trace leaks)',
    fix: 'Validate fromId/toId/amount types before use and return 400.',
  },
  {
    id: 'BANK-12', title: '/admin/accounts has no authorization and exposes every balance',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/accounts with any (or no) user',
    expected: 'Admin-only',
    actual: 'Any caller gets every customer’s account number, owner, and balance — no role check',
    fix: 'Gate on an admin role; never expose other customers’ balances to a non-admin.',
  },
];
