// VaultAuth (Auth module) — the answer key. Every intentionally injected bug
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
  area: 'HTTP / Contract' | 'Authentication' | 'Session' | 'Security';
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
    id: 'AUTH-01', title: 'No password-strength check on signup — "123" is accepted',
    area: 'Authentication', testType: 'Functional', characteristic: 'Security',
    testDesign: 'Boundary Value Analysis', testLevel: 'Contract',
    repro: 'POST /signup with password "123"',
    expected: '400 — the password fails the strength policy',
    actual: 'The weak password is accepted and the account is created',
    fix: 'Enforce a minimum length / complexity policy on signup and change.',
  },
  {
    id: 'AUTH-02', title: 'No account lockout — logins are brute-forceable',
    area: 'Authentication', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Boundary Value Analysis', testLevel: 'Integration',
    repro: 'POST /login with a wrong password many times, then again',
    expected: 'After N failed attempts the account is locked / rate-limited (429)',
    actual: 'failed_logins is incremented but never checked — unlimited attempts',
    fix: 'Lock (or throttle) once failed_logins crosses a threshold, and reset on success.',
  },
  {
    id: 'AUTH-03', title: 'An expired session token is accepted',
    area: 'Session', testType: 'Functional', characteristic: 'Security',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'GET /me with the seeded EXPIRED-TOKEN',
    expected: '401 — the session has expired',
    actual: 'The profile is returned; expires_at is never checked',
    fix: 'Reject a session whose expires_at is in the past.',
  },
  {
    id: 'AUTH-04', title: 'User enumeration — unknown email and wrong password give different responses',
    area: 'Authentication', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Equivalence Partitioning', testLevel: 'Integration',
    repro: 'POST /login for a non-existent email vs an existing email with a wrong password',
    expected: 'The same generic 401 for both (no account disclosure)',
    actual: 'Unknown email → 404 "user not found"; wrong password → 401 — so accounts are enumerable',
    fix: 'Return an identical generic error for both cases.',
  },
  {
    id: 'AUTH-05', title: 'Passwords are stored in plaintext (and echoed by admin)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Checklist / Heuristic', testLevel: 'Integration',
    repro: 'Sign up, then inspect the users table / GET /admin/users',
    expected: 'Passwords are salted+hashed and never returned',
    actual: 'The password column is plaintext and /admin/users returns it',
    fix: 'Hash with bcrypt/argon2 on write; never select/return the password.',
  },
  {
    id: 'AUTH-06', title: '2FA code compared numerically — a leading-zero variant passes',
    area: 'Authentication', testType: 'Functional', characteristic: 'Security',
    testDesign: 'Boundary Value Analysis', testLevel: 'Component',
    repro: "POST /login/verify-2fa with code '42519' when the real code is '042519'",
    expected: 'Codes compared as fixed-length strings (constant-time)',
    actual: 'Number(code) === Number(mfa_code), so 42519 == 042519 passes',
    fix: 'Compare the codes as strings (and use a constant-time comparison).',
  },
  {
    id: 'AUTH-07', title: 'Logout does not invalidate the session token',
    area: 'Session', testType: 'Functional', characteristic: 'Security',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /logout with a token, then GET /me with the same token',
    expected: 'The token is revoked and no longer works',
    actual: '/me still returns the profile — logout never sets revoked',
    fix: 'Mark the session revoked on logout and reject revoked tokens.',
  },
  {
    id: 'AUTH-08', title: 'A password-reset code is reusable',
    area: 'Authentication', testType: 'Functional', characteristic: 'Security',
    testDesign: 'State Transition', testLevel: 'Integration',
    repro: 'POST /reset/confirm with the same code twice',
    expected: 'A reset code is single-use (409 on the second call)',
    actual: 'Both succeed — the used flag is never set or checked',
    fix: 'Mark the code used on first success and reject an already-used code.',
  },
  {
    id: 'AUTH-09', title: 'A missing session returns 200 with null instead of 404',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Functional correctness',
    testDesign: 'Error Guessing', testLevel: 'Contract',
    repro: 'GET /sessions/does-not-exist',
    expected: '404 Not Found',
    actual: '200 OK with a null body',
    fix: 'Return 404 when no session row is found.',
  },
  {
    id: 'AUTH-10', title: 'Malformed body returns a 500 HTML stack trace instead of 400',
    area: 'HTTP / Contract', testType: 'Functional', characteristic: 'Reliability',
    testDesign: 'Equivalence Partitioning', testLevel: 'Contract',
    repro: 'POST /login with a truncated / invalid JSON body',
    expected: '400 Bad Request with a clean JSON error',
    actual: '500 text/html with a raw stack trace (internals leaked)',
    fix: 'Handle parse/validation errors as 400 with a JSON envelope.',
  },
  {
    id: 'AUTH-11', title: '/admin/users has no authorization and dumps users (with plaintext passwords)',
    area: 'Security', testType: 'Non-functional', characteristic: 'Security',
    testDesign: 'Exploratory', testLevel: 'Integration',
    repro: 'GET /admin/users with no admin credentials',
    expected: '403 unless the caller is an admin; passwords never exposed',
    actual: 'Returns all users including plaintext passwords, no authorization',
    fix: 'Require an admin role and never return password material.',
  },
  {
    id: 'AUTH-12', title: '2FA is not enforced — an unverified session reaches protected data',
    area: 'Authentication', testType: 'Functional', characteristic: 'Security',
    testDesign: 'Decision Table', testLevel: 'Integration',
    repro: 'GET /me with the seeded NOMFA-TOKEN (mfa_enabled user, mfa_passed = false)',
    expected: '401/step-up — 2FA must be completed before the session is trusted',
    actual: 'The profile is returned; mfa_passed is never required',
    fix: 'For MFA-enabled users, require mfa_passed = true before serving protected routes.',
  },
];
