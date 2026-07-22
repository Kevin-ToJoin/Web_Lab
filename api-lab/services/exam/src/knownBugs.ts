// CertifyHub (Exam module) — the answer key. Every intentionally injected bug
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
  area: 'HTTP / Contract' | 'Scoring' | 'Timing' | 'Security';
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
    id: 'EXAM-01', title: 'Pass cutoff uses > instead of >= — a score exactly at the cutoff fails',
    area: 'Scoring', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'Submit answers that score exactly the pass percentage (e.g. 60% on a 60% exam)',
    expected: 'passed = true at exactly the cutoff (>=)',
    actual: 'passed = percentage > pass_pct, so exactly-at-cutoff is a fail',
    fix: 'Compare with >= at the cutoff.',
  },
  {
    id: 'EXAM-02', title: 'Percentage is floored — a passing 59.5% shows as 59%',
    area: 'Scoring', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'Score a fractional percentage (e.g. 3.5/5 with negative marking)',
    expected: 'Percentage is rounded to the nearest (or kept exact), not floored',
    actual: 'Math.floor() is applied, dropping the fraction and pushing borderline results down',
    fix: 'Round (or keep the exact value) instead of flooring.',
  },
  {
    id: 'EXAM-03', title: 'Negative marking penalizes UNANSWERED questions too',
    area: 'Scoring', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Decision Table', testLevel: 'Component',
    repro: 'Leave questions blank on an exam with negative marking',
    expected: 'A penalty applies only to WRONG answers, never to blanks',
    actual: 'The penalty is applied to (wrong + blank), so skipping is punished',
    fix: 'Apply the penalty only to answered-and-wrong questions.',
  },
  {
    id: 'EXAM-04', title: 'A submission after the time limit is accepted',
    area: 'Timing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'Submit with started_at more than duration_min ago',
    expected: '409/400 — the exam window has closed (auto-submit / reject)',
    actual: 'The late submission is scored normally; the deadline is never checked',
    fix: 'Reject (or auto-submit at the deadline) when now − started_at > duration_min.',
  },
  {
    id: 'EXAM-05', title: 'The retake limit (max_attempts) is not enforced',
    area: 'Timing', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'Submit the same exam more times than max_attempts',
    expected: '409 once the attempt limit is reached',
    actual: 'Unlimited attempts are accepted',
    fix: 'Count existing attempts and reject when they reach max_attempts.',
  },
  {
    id: 'EXAM-06', title: 'The questions endpoint leaks the correct answers',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /exams/1/questions before submitting',
    expected: 'Only prompts and option counts are returned — never correct_index',
    actual: 'Each question includes correct_index, so a candidate can read the key',
    fix: 'Never select/return correct_index to the client.',
  },
  {
    id: 'EXAM-07', title: 'An answer index outside the option range is accepted',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'Submit an answer index of 99 for a 4-option question',
    expected: '400 — answer index must be within [0, num_options)',
    actual: 'Out-of-range indices are accepted (scored as wrong, silently)',
    fix: 'Validate each answer index against the question’s num_options.',
  },
  {
    id: 'EXAM-08', title: 'A missing attempt returns 200 with null instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /attempts/9999',
    expected: '404 Not Found',
    actual: '200 OK with a null body',
    fix: 'Return 404 when no attempt row is found.',
  },
  {
    id: 'EXAM-09', title: 'Malformed body returns a 500 HTML stack trace instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /exams/1/submit with a truncated / invalid JSON body',
    expected: '400 Bad Request with a clean JSON error',
    actual: '500 text/html with a raw stack trace (internals leaked)',
    fix: 'Handle parse/validation errors as 400 with a JSON envelope.',
  },
  {
    id: 'EXAM-10', title: 'Duplicate submission records a second attempt (no idempotency)',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'Submit the same exam twice quickly (e.g. a double click)',
    expected: 'A single attempt is recorded (idempotent within a session)',
    actual: 'Each POST inserts another attempt row',
    fix: 'Key attempts by an idempotency/session token and de-duplicate.',
  },
  {
    id: 'EXAM-11', title: 'The score is not clamped — a mostly-wrong exam yields a negative score',
    area: 'Scoring', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: 'Answer most questions wrong on a negative-marking exam',
    expected: 'The score floors at 0',
    actual: 'score = correct − penalty*wrong can go below 0 (and so can the percentage)',
    fix: 'Clamp the final score to a minimum of 0.',
  },
  {
    id: 'EXAM-12', title: '/admin/results has no authorization and exposes every candidate’s scores',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/results with no admin credentials',
    expected: '403 unless the caller is an admin',
    actual: 'Returns all attempts for all candidates, no authorization',
    fix: 'Require an admin role before returning the results.',
  },
];
