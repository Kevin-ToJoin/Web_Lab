// SecureQuote (Insurance module) — the answer key. Every intentionally injected
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
  area: 'HTTP / Contract' | 'Rating' | 'Pricing' | 'Security';
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
    id: 'INSU-01', title: 'Age-band boundary off-by-one — age 25 is charged the under-25 rate',
    area: 'Rating', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'POST /quotes with age 25',
    expected: 'The young-driver 1.5× loading applies only under 25 (age < 25)',
    actual: 'Uses age <= 25, so a 25-year-old pays the higher young-driver rate',
    fix: 'Use age < 25 for the young band.',
  },
  {
    id: 'INSU-02', title: 'Discounts are not clamped — total discount can exceed 100% (negative premium)',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Decision Table', testLevel: 'Component',
    repro: 'POST /quotes stacking promos so the combined discount exceeds 1.0',
    expected: 'The total discount is clamped to [0, some cap]; premium never below 0',
    actual: 'premium = base * (1 − totalDiscount) goes negative — the insurer would pay the customer',
    fix: 'Clamp the total discount (e.g. to a max like 0.30) before applying.',
  },
  {
    id: 'INSU-03', title: 'Risk factors are added instead of multiplied',
    area: 'Rating', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Decision Table', testLevel: 'Component',
    repro: 'POST /quotes as a smoker in a high-risk region and check the risk multiplier',
    expected: 'Independent risk loadings multiply: (1+0.3)·(1+0.2) = 1.56',
    actual: 'They are summed: 1 + 0.3 + 0.2 = 1.5, understating combined risk',
    fix: 'Multiply the per-factor loadings, not sum them.',
  },
  {
    id: 'INSU-04', title: 'Premiums computed in float — the price drifts by fractions of a cent',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Request a quote and inspect the premium arithmetic',
    expected: 'Exact-to-the-cent premiums',
    actual: 'DOUBLE PRECISION math produces values like 140.40000000000003',
    fix: 'Use NUMERIC(10,2) (or integer cents) and round the final premium.',
  },
  {
    id: 'INSU-05', title: 'Coverage amount is not validated — zero/negative coverage is accepted',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /quotes with coverage_amount 0 or -50000',
    expected: '400 — coverage must be a positive amount',
    actual: 'The quote is created (premium becomes 0 or negative)',
    fix: 'Reject when coverage_amount <= 0.',
  },
  {
    id: 'INSU-06', title: 'The smoker flag is truthy-checked — the string "false" applies the surcharge',
    area: 'Rating', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Equivalence Partitioning', testLevel: 'Component',
    repro: 'POST /quotes with smoker: "false" (a string)',
    expected: 'Only a real boolean true applies the smoker loading',
    actual: 'The code does `if (smoker)`, and the non-empty string "false" is truthy → surcharge wrongly applied',
    fix: 'Coerce/validate smoker to a real boolean (smoker === true).',
  },
  {
    id: 'INSU-07', title: 'No-claims discount boundary — a driver with 1 prior claim still gets it',
    area: 'Rating', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'POST /quotes with prior_claims 1',
    expected: 'The no-claims discount applies only at 0 claims',
    actual: 'Uses prior_claims <= 1, so one claim still earns the discount',
    fix: 'Grant the no-claims discount only when prior_claims === 0.',
  },
  {
    id: 'INSU-08', title: 'A missing quote returns 200 with null instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /quotes/9999',
    expected: '404 Not Found',
    actual: '200 OK with a null body',
    fix: 'Return 404 when no quote row is found.',
  },
  {
    id: 'INSU-09', title: 'Malformed body returns a 500 HTML stack trace instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /quotes with a truncated / invalid JSON body',
    expected: '400 Bad Request with a clean JSON error',
    actual: '500 text/html with a raw stack trace (internals leaked)',
    fix: 'Handle parse/validation errors as 400 with a JSON envelope.',
  },
  {
    id: 'INSU-10', title: 'PII leak / IDOR — GET /quotes/:id returns SSN and DOB, no ownership check',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /quotes/1 with any (or no) X-User-Id',
    expected: 'Only the owner may read the quote; SSN/DOB must not reach other callers',
    actual: 'Any caller gets ssn and dob — no ownership check, no field stripping',
    fix: 'Enforce ownership (X-User-Id vs user_id) and never return ssn/dob.',
  },
  {
    id: 'INSU-11', title: '/admin/quotes has no authorization and exposes every quote (with PII)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/quotes with no admin credentials',
    expected: '403 unless the caller is an admin',
    actual: 'Returns all quotes including SSNs, no authorization',
    fix: 'Require an admin role and strip PII from the response.',
  },
  {
    id: 'INSU-12', title: 'The high-risk-region surcharge is only applied to Auto (wrong decision-table cell)',
    area: 'Rating', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Decision Table', testLevel: 'Component',
    repro: 'POST /quotes for a Home or Life product in a high-risk region',
    expected: 'The high-risk-region loading applies to every product',
    actual: 'The surcharge is gated on product name Auto, so Home/Life skip it',
    fix: 'Apply the region loading regardless of product type.',
  },
];
