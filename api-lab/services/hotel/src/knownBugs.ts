// StayEasy (Hotel module) — the answer key. Every intentionally injected bug
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
  area: 'HTTP / Contract' | 'Database' | 'Pricing' | 'Availability' | 'Time' | 'Security';
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
    id: 'HOTL-01', title: 'Check-out on or before check-in is accepted',
    area: 'Availability', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /bookings with check_out equal to (or before) check_in',
    expected: '400 — check_out must be strictly after check_in',
    actual: 'The booking is created (nights becomes 0 or negative)',
    fix: 'Reject when check_out <= check_in.',
  },
  {
    id: 'HOTL-02', title: 'Overbooking — a room can be booked over an existing reservation',
    area: 'Availability', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'POST /bookings for room 3 with dates overlapping the seeded confirmed booking',
    expected: '409 Conflict — the room is not available for those dates',
    actual: 'Both bookings coexist — there is no overlap/availability check',
    fix: 'Reject when a confirmed booking for the room overlaps the requested range (e.g. an EXCLUDE constraint or an overlap query).',
  },
  {
    id: 'HOTL-03', title: 'Nights are counted inclusively — one extra night is charged',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'Book check_in Mon → check_out Wed (2 nights) and read nights/total',
    expected: 'nights = check_out − check_in (2)',
    actual: 'nights is computed as the day difference + 1 (3), so the guest is overcharged a night',
    fix: 'nights = days between check_out and check_in, without the +1.',
  },
  {
    id: 'HOTL-04', title: 'Rates and totals stored as float — the price drifts by cents',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Book several nights at 89.90 and check the total',
    expected: 'Exact-to-the-cent totals',
    actual: 'DOUBLE PRECISION math produces values like 269.70000000000005',
    fix: 'Use NUMERIC(10,2) (or integer cents) for money.',
  },
  {
    id: 'HOTL-05', title: 'Guest count above room capacity is accepted',
    area: 'Availability', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /bookings for a Standard room (capacity 2) with guests = 6',
    expected: '400 — guests must not exceed the room capacity',
    actual: 'The over-capacity booking is created',
    fix: 'Reject when guests > room.capacity (or < 1).',
  },
  {
    id: 'HOTL-06', title: 'Discount is not clamped — a discount over 100% makes the total negative',
    area: 'Pricing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Decision Table', testLevel: 'Component',
    repro: 'POST /bookings with discount = 1.5 (150%)',
    expected: 'Discount clamped to [0, 1]; total never below 0',
    actual: 'total = base * (1 − discount) goes negative — the hotel would owe the guest',
    fix: 'Clamp discount to [0, 1] (and validate promo codes) before applying.',
  },
  {
    id: 'HOTL-07', title: 'Check-in dates have no time zone — the arrivals list drifts',
    area: 'Time', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'Create a late-evening check-in, then GET /bookings/arrivals from another time zone',
    expected: 'A check-in maps to the same calendar day everywhere',
    actual: 'check_in is TIMESTAMP (no zone), so a late arrival can fall on the wrong day',
    fix: 'Store DATE / TIMESTAMPTZ and compute arrivals against the hotel time zone.',
  },
  {
    id: 'HOTL-08', title: 'Missing booking returns 200 with null instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /bookings/9999',
    expected: '404 Not Found',
    actual: '200 OK with a null body',
    fix: 'Return 404 when no booking row is found.',
  },
  {
    id: 'HOTL-09', title: 'Malformed body returns a 500 HTML stack trace instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /bookings with a truncated / invalid JSON body',
    expected: '400 Bad Request with a clean JSON error',
    actual: '500 text/html with a raw stack trace (internals leaked)',
    fix: 'Handle parse/validation errors as 400 with a JSON envelope.',
  },
  {
    id: 'HOTL-10', title: 'A checked-out booking can still be cancelled (illegal state transition)',
    area: 'Availability', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /bookings/2/cancel on the seeded already checked_out booking',
    expected: '409 — only a confirmed (future) booking may be cancelled',
    actual: 'The status is overwritten to cancelled from any state',
    fix: 'Guard the transition: only confirmed → cancelled is allowed.',
  },
  {
    id: 'HOTL-11', title: 'PII leak / IDOR — GET /bookings/:id returns the guest email, no ownership check',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /bookings/1 with any (or no) X-User-Id',
    expected: 'Only the owner may read the booking; guest PII is not exposed to others',
    actual: 'Any caller gets the full row including guest_email — no ownership check',
    fix: 'Enforce ownership (compare X-User-Id to user_id) and avoid returning PII to non-owners.',
  },
  {
    id: 'HOTL-12', title: '/admin/bookings has no authorization and exposes every booking (with PII)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/bookings with no admin credentials',
    expected: '403 unless the caller is an admin',
    actual: 'Returns all bookings including guest emails, no authorization',
    fix: 'Require an admin role and strip PII from the response.',
  },
];
