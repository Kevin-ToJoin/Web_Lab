// The backend's answer to the frontend QA Inspector: a registry of every
// intentionally injected bug, each tagged with its ISTQB classification.
// Served (instructor-gated) at GET /_lab/bugs?key=REVEAL.

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
  area: 'HTTP / Contract' | 'Database' | 'Queue / Async' | 'Security';
  testType: TestType;
  characteristic: string;
  testDesign: TestDesign;
  testLevel: TestLevel;
  repro: string;   // how to trigger it (curl-friendly)
  expected: string;
  actual: string;
  fix: string;
}

export const KNOWN_BUGS: ApiBug[] = [
  // ─── HTTP / Contract ──────────────────────────────────────────────────
  {
    id: 'BUG-API-01', title: 'Missing product returns 200 with null body instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /products/9999',
    expected: '404 Not Found with an error body',
    actual: '200 OK with body `null`',
    fix: 'Return res.status(404).json({ error: "Product not found" }) when the row is missing.',
  },
  {
    id: 'BUG-API-02', title: 'Invalid order payload returns 500 instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /orders with body {"items": "not-an-array"}',
    expected: '400 Bad Request describing the validation failure',
    actual: '500 Internal Server Error (unhandled exception leaks a stack trace)',
    fix: 'Validate the payload shape before use and return 400 with field errors.',
  },
  {
    id: 'BUG-API-03', title: 'Successful create returns 200, not 201, and no Location header',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Checklist / Heuristic', testLevel: 'Contract',
    repro: 'POST /orders (valid) → inspect status + headers',
    expected: '201 Created with a Location: /orders/{id} header',
    actual: '200 OK, no Location header',
    fix: 'res.status(201).location(`/orders/${id}`).json(order).',
  },
  {
    id: 'BUG-API-04', title: 'Failed login returns 200 with an error body instead of 401',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Security',
    testDesign: 'Decision Table', testLevel: 'Contract',
    repro: 'POST /login with a wrong password',
    expected: '401 Unauthorized',
    actual: '200 OK with { ok: false } — success/failure indistinguishable by status',
    fix: 'Return 401 on bad credentials; reserve 200 for a successful auth.',
  },
  {
    id: 'BUG-API-05', title: 'Error responses use text/html and an inconsistent envelope',
    area: 'HTTP / Contract', testType: 'Non-functional', characteristic: 'Usability (API)',
    testDesign: 'Checklist / Heuristic', testLevel: 'Contract',
    repro: 'Trigger any error and inspect Content-Type + body shape across endpoints',
    expected: 'application/json with one consistent { error } envelope everywhere',
    actual: 'Some errors are plain strings, some { error }, some { message }; default 500s are text/html',
    fix: 'Add one JSON error-handling middleware and use a single { error } shape.',
  },
  {
    id: 'BUG-API-06', title: 'List endpoint has no max page size (limit not capped)',
    area: 'HTTP / Contract', testType: 'Non-functional', characteristic: 'Performance',
    testDesign: 'Boundary Value Analysis', testLevel: 'System',
    repro: 'GET /products?limit=1000000',
    expected: 'limit is clamped (e.g. max 100)',
    actual: 'The full table is returned; a huge limit is honored — a DoS/perf vector',
    fix: 'const limit = Math.min(Number(req.query.limit) || 20, 100).',
  },
  {
    id: 'BUG-API-07', title: 'Health check returns 200 even when the database is down',
    area: 'HTTP / Contract', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Error Guessing', testLevel: 'System',
    repro: 'Stop the db container, then GET /health',
    expected: '503 Service Unavailable when a dependency is unhealthy',
    actual: '200 OK { status: "ok" } — a false-positive health signal',
    fix: 'Run SELECT 1 against the pool inside /health and 503 on failure.',
  },
  {
    id: 'BUG-API-08', title: 'Idempotency-Key is ignored — repeat POST creates duplicate orders',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /orders twice with the same Idempotency-Key header',
    expected: 'Second call returns the same order (200) — no duplicate; or 409 Conflict',
    actual: 'Two distinct orders are created; the key is stored but never checked',
    fix: 'Add UNIQUE(idem_key) and look it up before insert; return the existing order.',
  },

  // ─── Database ─────────────────────────────────────────────────────────
  {
    id: 'BUG-DB-01', title: 'users.email has no UNIQUE constraint — duplicate signups',
    area: 'Database', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Equivalence Partitioning', testLevel: 'Integration',
    repro: 'POST /signup twice with the same email',
    expected: 'Second signup rejected (409 Conflict)',
    actual: 'Two user rows with the same email — inspect the users table in Adminer',
    fix: 'ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email).',
  },
  {
    id: 'BUG-DB-02', title: 'order_items.product_id has no foreign key — orphan rows',
    area: 'Database', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Checklist / Heuristic', testLevel: 'Integration',
    repro: 'Query order_items in Adminer — row for order 1 references product_id 999',
    expected: 'A referential constraint prevents items pointing at non-existent products',
    actual: 'Orphan order_items survive; joins silently drop or mis-price them',
    fix: 'Add FOREIGN KEY (product_id) REFERENCES products(id).',
  },
  {
    id: 'BUG-DB-03', title: 'Order creation is not transactional — partial writes on failure',
    area: 'Database', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Error Guessing', testLevel: 'Integration',
    repro: 'POST /orders where one item is valid and another is out of stock',
    expected: 'All-or-nothing: the whole order rolls back',
    actual: 'The order row and the first item persist while the stock update fails — inconsistent state',
    fix: 'Wrap the inserts + stock decrement in BEGIN/COMMIT with ROLLBACK on error.',
  },
  {
    id: 'BUG-DB-04', title: 'Product search is built with string concatenation (SQL injection)',
    area: 'Database', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Error Guessing', testLevel: 'Integration',
    repro: "GET /products?search=' OR '1'='1",
    expected: 'The search term is parameterized; injection has no effect',
    actual: "The query is `... WHERE name LIKE '%${search}%'` — the payload alters the query",
    fix: 'Use a parameterized query: WHERE name ILIKE $1 with `%term%` as the bound value.',
  },
  {
    id: 'BUG-DB-05', title: 'Overselling: concurrent orders drive stock negative (no row lock)',
    area: 'Database', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'Run load/k6-oversell.js against a product with stock 2 — fire 20 concurrent orders',
    expected: 'At most `stock` orders succeed; the rest get 409; stock never goes below 0',
    actual: 'Read-then-write with no SELECT … FOR UPDATE lets many orders pass; stock goes negative',
    fix: 'SELECT stock … FOR UPDATE inside a transaction, or an atomic UPDATE … WHERE stock >= qty.',
  },
  {
    id: 'BUG-DB-06', title: 'Money stored as float — cent rounding drift',
    area: 'Database', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Create an order with quantities that sum to values like 0.1 + 0.2; inspect total',
    expected: 'Totals are exact to the cent',
    actual: 'DOUBLE PRECISION columns accumulate drift (e.g. 24.99 * 3 → 74.97000000000001)',
    fix: 'Store money as NUMERIC(10,2) (or integer cents), not DOUBLE PRECISION.',
  },

  // ─── Queue / Async ────────────────────────────────────────────────────
  {
    id: 'BUG-Q-01', title: 'Fulfillment consumer is not idempotent — retries double-process',
    area: 'Queue / Async', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'Place an order for the "Electric Grinder" (its job throws once then succeeds on retry); watch worker logs',
    expected: 'A retried job is processed exactly once (dedupe via processed_jobs)',
    actual: 'The job "charges" and "emails" again on every retry — processed_jobs is never consulted',
    fix: 'At the top of the worker, INSERT the job id into processed_jobs; skip if it already exists.',
  },
  {
    id: 'BUG-Q-02', title: 'A poison message stalls the queue — no dead-letter handling',
    area: 'Queue / Async', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Error Guessing', testLevel: 'System',
    repro: 'POST /orders with { "poison": true } → the worker throws forever; GET /admin/queue shows it stuck',
    expected: 'After N attempts the message moves to a dead-letter queue and the worker keeps going',
    actual: 'No attempts limit / no DLQ — the bad job retries indefinitely and blocks throughput',
    fix: 'Set attempts + backoff on the job and route exhausted jobs to a DLQ for inspection.',
  },

  // ─── Security ─────────────────────────────────────────────────────────
  {
    id: 'BUG-SEC-01', title: 'IDOR — any order can be read by id without ownership check',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'Authenticate as bob (X-User-Id: 2) then GET /orders/1 (alice’s order)',
    expected: '403 Forbidden — you can only read your own orders',
    actual: 'The order is returned; the handler never checks user_id against the caller',
    fix: 'WHERE id = $1 AND user_id = $caller, and 404/403 otherwise.',
  },
  {
    id: 'BUG-SEC-02', title: '/admin/users leaks password hashes and lacks authorization',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/users with any (or no) user — inspect the response',
    expected: 'Admin-only, and password_hash never leaves the server',
    actual: 'Any caller gets the full rows including password_hash — no role check, no field stripping',
    fix: 'Gate on role=admin and SELECT only id, email, role.',
  },
  {
    id: 'BUG-SEC-03', title: 'Login has no rate limiting — unlimited brute force (no 429)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'POST /login 100x rapidly with wrong passwords',
    expected: 'After a threshold, 429 Too Many Requests with a Retry-After',
    actual: 'Every attempt is processed; no lockout, no 429',
    fix: 'Add per-IP/email attempt counting (Redis) and return 429 past the threshold.',
  },
];
