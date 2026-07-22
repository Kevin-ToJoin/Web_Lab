// Patient Portal (Healthcare module) — the answer key. Every intentionally
// injected bug with its ISTQB classification. Served at GET /_lab/bugs?key=REVEAL.

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
  area: 'HTTP / Contract' | 'Database' | 'Clinical Logic' | 'Scheduling' | 'Security';
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
    id: 'HLTH-01', title: 'An appointment can be booked in the past',
    area: 'Scheduling', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /appointments with slot_at set to yesterday',
    expected: '400 — appointments must be in the future',
    actual: '201 Created; the past slot is accepted',
    fix: 'Reject slot_at <= now() before inserting.',
  },
  {
    id: 'HLTH-02', title: 'Double-booking — the same provider + slot can be booked twice',
    area: 'Scheduling', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'POST /appointments twice with the same provider_id and slot_at',
    expected: '409 Conflict on the second booking',
    actual: 'Both succeed — there is no conflict check and no UNIQUE(provider_id, slot_at)',
    fix: 'Add a UNIQUE(provider_id, slot_at) constraint (and handle the conflict as 409).',
  },
  {
    id: 'HLTH-03', title: 'Copay decision table: deductible-met check uses > instead of >=',
    area: 'Clinical Logic', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Decision Table', testLevel: 'Component',
    repro: 'POST /copay/estimate for a patient whose deductible_met exactly equals the plan deductible',
    expected: 'Deductible is considered MET at the exact threshold → lower copay tier applies',
    actual: 'Uses deductible_met > deductible, so at exactly the threshold the patient is charged the pre-deductible rate',
    fix: 'Compare with >= at the threshold.',
  },
  {
    id: 'HLTH-04', title: 'Pediatric eligibility off-by-one on the age cutoff',
    area: 'Clinical Logic', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'POST /copay/estimate for a patient who is exactly 18 today',
    expected: 'Age 18 is an adult (pediatric is age < 18)',
    actual: 'Uses age <= 18 for pediatric, so an 18-year-old is priced as a child',
    fix: 'Pediatric when age < 18; adult when age >= 18.',
  },
  {
    id: 'HLTH-05', title: 'PHI leak / IDOR — GET /patients/:id returns SSN and needs no authorization',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /patients/1 with any (or no) X-User-Id',
    expected: 'Only the owner may read the record, and the SSN must never be returned to the client',
    actual: 'Any caller gets the full row including ssn — no ownership check, no field stripping',
    fix: 'Enforce ownership (compare X-User-Id to user_id) and never select/return ssn.',
  },
  {
    id: 'HLTH-06', title: 'Vitals accepted with no physiological range validation',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /vitals with systolic 9999 and heart_rate -5',
    expected: '400 — values must be within plausible clinical ranges',
    actual: 'Any integer is stored, including impossible vitals',
    fix: 'Validate ranges (e.g. systolic 50–300, heart_rate 20–250) and reject out-of-range.',
  },
  {
    id: 'HLTH-07', title: 'Appointment date-range query is end-exclusive — it misses same-day appointments',
    area: 'Scheduling', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'GET /appointments?from=2026-07-01&to=2026-07-01 for an appointment on 2026-07-01',
    expected: 'An appointment on the "to" date is included (inclusive range)',
    actual: 'Uses slot_at < to, so anything on the end date is dropped',
    fix: 'Make the upper bound inclusive (slot_at < to + 1 day, or slot_at <= end-of-day).',
  },
  {
    id: 'HLTH-08', title: 'Missing patient returns 200 with null instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /patients/9999',
    expected: '404 Not Found',
    actual: '200 OK with a null body',
    fix: 'Return 404 when no row is found.',
  },
  {
    id: 'HLTH-09', title: 'Malformed JSON body returns a 500 HTML stack trace instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /appointments with a truncated / invalid JSON body',
    expected: '400 Bad Request with a clean JSON error',
    actual: '500 text/html with a raw stack trace (internals leaked)',
    fix: 'Handle body-parse errors and unknown fields as 400 with a JSON envelope.',
  },
  {
    id: 'HLTH-10', title: 'Appointment times stored without a time zone — "today" drifts by locale',
    area: 'Scheduling', testType: 'Non-functional', characteristic: 'Reliability',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'Book near midnight, then list GET /appointments/today from a client in another time zone',
    expected: 'A slot maps to the same instant regardless of server/client time zone',
    actual: 'slot_at is TIMESTAMP (no zone), so a late-evening slot can shift to the wrong day',
    fix: 'Store TIMESTAMPTZ and compare against a zone-aware "today".',
  },
  {
    id: 'HLTH-11', title: 'A completed appointment can still be cancelled (illegal state transition)',
    area: 'Scheduling', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /appointments/2/cancel on an appointment whose status is already "completed"',
    expected: '409 — only a "booked" appointment may be cancelled',
    actual: 'The status is overwritten to "cancelled" from any state',
    fix: 'Guard the transition: only booked → cancelled is allowed.',
  },
  {
    id: 'HLTH-12', title: '/admin/patients has no authorization and dumps every patient (with SSN)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/patients with no admin credentials',
    expected: '403 unless the caller is an admin; SSNs never exposed',
    actual: 'Returns all patients including SSNs, no authorization at all',
    fix: 'Require an admin role and strip PHI from the response.',
  },
];
