// TechMart Catalog API (Catalog module) — the answer key. Every injected bug
// with its ISTQB classification. Served at GET /_lab/bugs?key=REVEAL.

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
  area: 'HTTP / Contract' | 'Search / Query' | 'Reviews' | 'Security' | 'Performance';
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
    id: 'CATA-01', title: 'The "Home Goods" category filter also returns Electronics',
    area: 'Search / Query', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Equivalence Partitioning', testLevel: 'Integration',
    repro: 'GET /products?category=Home%20Goods — compare against GET /categories',
    expected: 'Only Home Goods products',
    actual: 'A spurious OR drags every Electronics product into the results',
    fix: 'Filter strictly on category = $1; remove the extra OR branch.',
  },
  {
    id: 'CATA-02', title: 'Search is case-sensitive (LIKE instead of ILIKE)',
    area: 'Search / Query', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'GET /products?search=headphones vs ?search=Headphones',
    expected: 'Case-insensitive matching',
    actual: 'Lowercase "headphones" returns nothing; only the exact case matches',
    fix: 'Use ILIKE (or lower(name) LIKE lower($1)).',
  },
  {
    id: 'CATA-03', title: 'Pagination `total` ignores the active filters',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Checklist / Heuristic', testLevel: 'Integration',
    repro: 'GET /products?category=Apparel — compare total vs items.length / GET /categories',
    expected: 'total reflects the filtered result set',
    actual: 'total is count(*) of the whole table regardless of filter',
    fix: 'Apply the same WHERE clause to the count query.',
  },
  {
    id: 'CATA-04', title: 'A page beyond the last returns the last page, not an empty list',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'GET /products?page=999',
    expected: 'An empty items array past the end',
    actual: 'The last page is silently re-served — pagination looks infinite',
    fix: 'Return an empty page when offset >= total; do not clamp to the last page.',
  },
  {
    id: 'CATA-05', title: 'A non-positive page produces a negative OFFSET → 500',
    area: 'HTTP / Contract', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'GET /products?page=0',
    expected: '400 Bad Request (page must be >= 1)',
    actual: 'offset = (0-1)*limit is negative; Postgres rejects it → unhandled 500',
    fix: 'Validate page >= 1 (and clamp) before building the query.',
  },
  {
    id: 'CATA-06', title: 'The `sort` parameter is concatenated into ORDER BY (SQL injection)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Error Guessing', testLevel: 'Integration',
    repro: "GET /products?sort=(SELECT CASE WHEN 1=1 THEN name ELSE price END) — or any injected ORDER BY expression",
    expected: 'sort is restricted to an allow-list of columns',
    actual: 'The raw value is spliced into ORDER BY, so arbitrary SQL runs',
    fix: 'Whitelist: const col = { name:1, price:1, id:1 }[sort] ? sort : "id".',
  },
  {
    id: 'CATA-07', title: 'A product with no reviews returns another product\'s reviews',
    area: 'Reviews', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Error Guessing', testLevel: 'Integration',
    repro: 'GET /products/2/reviews (product 2 has none)',
    expected: 'An empty review list',
    actual: 'Product 1\'s reviews are returned instead — wrong feedback shown',
    fix: 'Remove the fallback; an empty result is correct.',
  },
  {
    id: 'CATA-08', title: 'Average rating uses integer division (drops the decimal)',
    area: 'Reviews', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'GET /products/1/reviews (ratings 5 and 4 → true avg 4.5)',
    expected: 'averageRating 4.5',
    actual: 'Math.floor(sum/count) reports 4',
    fix: 'Compute a real average and round to one decimal for display.',
  },
  {
    id: 'CATA-09', title: 'POST review accepts a rating outside 1–5',
    area: 'Reviews', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /products/1/reviews { "rating": 6 } (or 0, or -3)',
    expected: '400 Bad Request — rating must be 1..5',
    actual: 'The out-of-range rating is stored and skews the average',
    fix: 'Reject rating < 1 || rating > 5 before insert.',
  },
  {
    id: 'CATA-10', title: 'Review comment is stored and served back raw (stored XSS)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Error Guessing', testLevel: 'Integration',
    repro: 'POST /products/1/reviews { "comment": "<img src=x onerror=alert(1)>" }, then GET the reviews',
    expected: 'Input is sanitized/encoded; scripts never round-trip',
    actual: 'The raw HTML is persisted and returned verbatim — it executes when rendered',
    fix: 'Sanitize on input and/or encode on output; never trust stored strings.',
  },
  {
    id: 'CATA-11', title: 'A non-numeric product id returns 500 instead of 400',
    area: 'HTTP / Contract', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'GET /products/abc',
    expected: '400 Bad Request (id must be an integer)',
    actual: 'Number("abc") is NaN and reaches the integer comparison → unhandled 500',
    fix: 'Validate the id is an integer up front and 400 otherwise.',
  },
  {
    id: 'CATA-12', title: 'A missing product silently returns product #1 instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /products/9999',
    expected: '404 Not Found',
    actual: 'The first product is returned as a fallback — a wrong 200',
    fix: 'Return 404 when the row is missing; drop the fallback.',
  },
  {
    id: 'CATA-13', title: 'expand=reviews triggers an N+1 query storm',
    area: 'Performance', testType: 'Non-functional', characteristic: 'Performance',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'GET /products?expand=reviews — watch the query count / latency grow with page size',
    expected: 'Reviews fetched in one batched query (or a JOIN)',
    actual: 'One reviews query is issued per product in a loop',
    fix: 'Fetch all reviews for the page in a single WHERE product_id = ANY($1) query.',
  },
];
