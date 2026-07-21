// DevPortal Registration API (Registration module) — the answer key. Every
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
  area: 'Signup / Validation' | 'Email Verification' | 'Login / Session' | 'Security';
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
    id: 'REGA-01', title: 'Email uniqueness is case-sensitive — Alice@ and alice@ both register',
    area: 'Signup / Validation', testType: 'Functional', characteristic: 'Data integrity',
    testDesign: 'Equivalence Partitioning', testLevel: 'Integration',
    repro: 'POST /signup with alice@dev.io (seeded), then again with Alice@Dev.io',
    expected: 'Both rejected as duplicates (email is case-insensitive)',
    actual: 'The uniqueness check compares exact case, so a cased variant creates a second account',
    fix: 'Compare and store lower(email); add a UNIQUE index on lower(email).',
  },
  {
    id: 'REGA-02', title: 'Passwords are stored in plaintext (never hashed)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Checklist / Heuristic', testLevel: 'Integration',
    repro: 'Sign up, then inspect the users table in Adminer',
    expected: 'Only a salted hash (bcrypt/argon2) is stored',
    actual: 'The raw password sits in the `password` column and is compared with ===',
    fix: 'Hash on signup (bcrypt/argon2) and verify with a constant-time compare.',
  },
  {
    id: 'REGA-03', title: 'No server-side password-strength check',
    area: 'Signup / Validation', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /signup with password "1"',
    expected: '400 — password must meet the policy (length, character classes)',
    actual: 'Any password is accepted; the client-side rule is the only guard',
    fix: 'Enforce the password policy on the server, never only in the UI.',
  },
  {
    id: 'REGA-04', title: 'Verification code is low-entropy / predictable',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'Sign up several times and inspect the codes in the DB',
    expected: 'A high-entropy, cryptographically-random code',
    actual: 'The code is Math.random() over a tiny range — guessable and non-uniform',
    fix: 'Generate with crypto.randomInt over a large space; store hashed.',
  },
  {
    id: 'REGA-05', title: 'Verification code compared numerically — leading zeros ignored',
    area: 'Email Verification', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'The seeded code for bob@dev.io is "042519"; POST /verify with code "42519"',
    expected: 'Only the exact string "042519" verifies',
    actual: 'Number("42519") === Number("042519") → the 5-digit value wrongly verifies',
    fix: 'Compare the codes as strings (constant-time), not as numbers.',
  },
  {
    id: 'REGA-06', title: 'Expired verification codes are still accepted',
    area: 'Email Verification', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'bob@dev.io\'s code expired yesterday; POST /verify with "042519" (or "42519") still succeeds',
    expected: '410/401 — the code has expired',
    actual: 'expires_at is never checked',
    fix: 'Reject when now() > expires_at.',
  },
  {
    id: 'REGA-07', title: 'Verification has no attempt limit — the code is brute-forceable',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'System',
    repro: 'POST /verify repeatedly with different codes for the same email',
    expected: 'Lockout / 429 after a few wrong attempts',
    actual: 'Unlimited attempts — a short code can be guessed offline-fast',
    fix: 'Count attempts per code and lock after N; expire the code on lockout.',
  },
  {
    id: 'REGA-08', title: 'User enumeration — login reveals whether an email exists',
    area: 'Login / Session', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Contract',
    repro: 'POST /login for a known vs unknown email; compare status/message',
    expected: 'One generic "invalid credentials" for both cases',
    actual: 'Unknown email → 404 "email not found"; known email, wrong password → 401 "wrong password"',
    fix: 'Return one identical response (and timing) whether or not the email exists.',
  },
  {
    id: 'REGA-09', title: 'Age accepts under-18, negative, or absurd values',
    area: 'Signup / Validation', testType: 'Functional', characteristic: 'Input validation',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /signup with age 5 (or -3, or 999)',
    expected: '400 — age must be a plausible adult value (e.g. 18..120)',
    actual: 'Any integer is stored with no range check',
    fix: 'Validate 18 <= age <= 120 before insert.',
  },
  {
    id: 'REGA-10', title: 'Verification code is reusable — never marked or checked as used',
    area: 'Email Verification', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'Verify successfully, then POST /verify again with the same code',
    expected: 'The code is single-use; a second attempt is rejected',
    actual: 'The `used` flag is never set or checked — the code can be replayed',
    fix: 'Mark used = true on success and reject already-used codes.',
  },
  {
    id: 'REGA-11', title: 'Re-verifying an already-verified account succeeds again',
    area: 'Email Verification', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'State Transition', testLevel: 'Contract',
    repro: 'POST /verify for alice@dev.io (already verified)',
    expected: '409/200 no-op that reflects the existing state',
    actual: 'The endpoint re-runs the verification transition unconditionally',
    fix: 'Short-circuit when status is already "verified".',
  },
  {
    id: 'REGA-12', title: 'Signup response echoes the password and internal fields',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Checklist / Heuristic', testLevel: 'Contract',
    repro: 'POST /signup and inspect the JSON response body',
    expected: 'Only safe fields (id, email, username, status) are returned',
    actual: 'The full row — including the plaintext password — is echoed back',
    fix: 'Whitelist the response fields; never serialize the password.',
  },
];
