import { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, LogIn, KeyRound, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

interface StoredUser {
  email: string;
  password: string;
}

interface ResetToken {
  token: string;
  email: string;
  issuedAt: number;   // simulated "now" tick when issued
  used: boolean;
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_LOGIN_ATTEMPTS = 3;
const RESET_TOKEN_TTL = 5;           // reset token valid for 5 simulated ticks
const COMMON_PASSWORDS = ['password', '123456', 'qwerty', 'letmein'];

// Simulated seed accounts (the "Users" table).
const SEED_USERS: StoredUser[] = [
  { email: 'admin@vault.io', password: 'Sup3rSecret!' },
];

const AuthInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  // A simulated clock we can advance deterministically (avoids wall-clock flakiness).
  const [now, setNow] = useState(0);

  const [users, setUsers] = useState<StoredUser[]>(SEED_USERS);

  // ----- Sign-up state -----
  const [suEmail, setSuEmail] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suStatus, setSuStatus] = useState('');

  // ----- Login state -----
  const [liEmail, setLiEmail] = useState('');
  const [liPass, setLiPass] = useState('');
  const [liStatus, setLiStatus] = useState('');
  // BUG AUT-09 (L8 State): the failed-attempts counter lives in component state and
  // is seeded to 0 on every mount/refresh, so reloading the page clears the lockout.
  // (Intended: persist attempts against the LoginAttempts store keyed by email.)
  const [attempts, setAttempts] = useState(0);
  const [session, setSession] = useState<{ email: string; issuedAt: number } | null>(null);

  // ----- Reset state -----
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState<ResetToken | null>(null);
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetStatus, setResetStatus] = useState('');

  // ----- 2FA state -----
  const [twoFaInput, setTwoFaInput] = useState('');
  const [twoFaStatus, setTwoFaStatus] = useState('');

  // ---------- helpers ----------

  // BUG AUT-06 (L6 Validation): the email regex is far too permissive — it only
  // checks for an "@" with something on each side, so "a@b" is accepted.
  // (Intended: require a dot-separated domain, e.g. /^[^@\s]+@[^@\s]+\.[^@\s]+$/.)
  const isValidEmail = (email: string) => /^[^@\s]+@[^@\s]+$/.test(email);

  const isCommonPassword = (pw: string) =>
    // BUG AUT-11 (L6 Logic): the blocklist compares case-sensitively, so "Password"
    // slips past the list of lowercase common passwords.
    // (Intended: compare pw.toLowerCase() against the blocklist.)
    COMMON_PASSWORDS.includes(pw);

  // Password strength meter (0-4). Returns { score, label }.
  const strength = (pw: string) => {
    let score = 0;
    if (pw.length >= MIN_PASSWORD_LENGTH) score++;
    if (/[A-Z]/.test(pw)) score++;
    // BUG AUT-02 (L7 Logic): the digit rule is counted twice — both branches test for
    // a digit — so a password with a number scores an extra point it did not earn.
    // (Intended: the second rule should test for a special character, e.g. /[^A-Za-z0-9]/.)
    if (/[0-9]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;

    // BUG AUT-14 (L7 Logic): any password of length >= 12 is force-labelled "Strong"
    // regardless of character variety, so "aaaaaaaaaaaa" reads as Strong.
    // (Intended: strength must come from character variety, not length alone.)
    if (pw.length >= 12) return { score: 4, label: 'Strong' };

    const label = score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score <= 3 ? 'Good' : 'Strong';
    return { score, label };
  };

  const suStrength = strength(suPass);

  // ---------- sign-up ----------
  const handleSignUp = () => {
    setSuStatus('');

    if (!isValidEmail(suEmail)) {
      setSuStatus('Please enter a valid email address.');
      return;
    }

    // BUG AUT-01 (L6 Boundary): the minimum-length gate uses > 6 (i.e. accepts 7),
    // when the policy minimum is 8. A 7-character password is wrongly accepted.
    // (Intended: suPass.length >= MIN_PASSWORD_LENGTH.)
    if (suPass.length > 6) {
      // passes the length check (buggy)
    } else {
      setSuStatus(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (isCommonPassword(suPass)) {
      setSuStatus('That password is too common — choose another.');
      return;
    }

    // BUG AUT-08 (L6 Logic): the confirm-password comparison is missing, so a
    // mismatch between password and confirmation is never caught.
    // (Intended: if (suPass !== suConfirm) { reject }.)
    void suConfirm;

    // BUG AUT-10 (L7 Logic): duplicate-account detection compares emails
    // case-SENSITIVELY here, while login (below) compares case-INSENSITIVELY.
    // The inconsistency lets "Admin@Vault.io" register as a second account.
    // (Intended: compare u.email.toLowerCase() === suEmail.toLowerCase().)
    const exists = users.find(u => u.email === suEmail);
    if (exists) {
      setSuStatus('An account with that email already exists.');
      return;
    }

    setUsers(prev => [...prev, { email: suEmail, password: suPass }]);
    setSuStatus(`Account created for ${suEmail}. You can now sign in.`);
  };

  // ---------- login ----------
  const handleLogin = () => {
    setLiStatus('');

    // BUG AUT-04 (L7 Boundary): the lockout guard uses > MAX_LOGIN_ATTEMPTS where it
    // should use >=, so one attempt beyond the limit is still allowed.
    // (Intended: if (attempts >= MAX_LOGIN_ATTEMPTS) { lock out }.)
    if (attempts > MAX_LOGIN_ATTEMPTS) {
      setLiStatus('Account locked due to too many failed attempts.');
      return;
    }

    // Login email compare is case-insensitive (see AUT-10 inconsistency note above).
    const user = users.find(u => u.email.toLowerCase() === liEmail.toLowerCase());

    // BUG AUT-12 (L9 Logic): the login flow reports a DIFFERENT message for an unknown
    // email vs a wrong password, leaking which accounts exist (user enumeration).
    // (Intended: a single generic "Invalid email or password." for both cases.)
    if (!user) {
      setAttempts(a => a + 1);
      setLiStatus('No account found for that email.');
      return;
    }
    if (user.password !== liPass) {
      setAttempts(a => a + 1);
      setLiStatus('Incorrect password for that account.');
      return;
    }

    setAttempts(0);
    // BUG AUT-13 (L8 Boundary): the session/"remember me" token is stamped but carries
    // no expiry, so the session never times out.
    // (Intended: store an expiresAt and reject/refresh once now > expiresAt.)
    setSession({ email: user.email, issuedAt: now });
    setLiStatus(`Signed in as ${user.email}. Enter your 2FA code to continue.`);
  };

  // ---------- 2FA ----------
  const handleVerify2fa = () => {
    // BUG AUT-07 (L7 Validation): the 2FA check accepts an empty string / any code —
    // there is no comparison to an issued code at all.
    // (Intended: verify twoFaInput === the 6-digit code sent to the user.)
    void twoFaInput;
    setTwoFaStatus('2FA verified — access granted.');
  };

  // ---------- reset ----------
  const handleIssueReset = () => {
    setResetStatus('');
    if (!isValidEmail(resetEmail)) {
      setResetStatus('Enter a valid email to receive a reset link.');
      return;
    }
    const token = 'RT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    setResetToken({ token, email: resetEmail, issuedAt: now, used: false });
    setResetTokenInput(token);
    setResetStatus(`Reset token issued: ${token} (expires in ${RESET_TOKEN_TTL} ticks).`);
  };

  const handleConsumeReset = () => {
    if (!resetToken) {
      setResetStatus('No reset token has been issued.');
      return;
    }
    if (resetTokenInput !== resetToken.token) {
      setResetStatus('That reset token is not recognised.');
      return;
    }

    // BUG AUT-03 (L8 Logic): the token expiry is never checked, so a token remains
    // valid indefinitely even after RESET_TOKEN_TTL ticks have elapsed.
    // (Intended: if (now - resetToken.issuedAt > RESET_TOKEN_TTL) { reject expired }.)
    void RESET_TOKEN_TTL;

    // BUG AUT-05 (L8 State): a used token is never marked used / invalidated, so the
    // same token can be replayed to reset the password again and again.
    // (Intended: if (resetToken.used) { reject } and set used = true after success.)
    void resetToken.used;

    setUsers(prev => prev.map(u =>
      u.email.toLowerCase() === resetToken.email.toLowerCase()
        ? { ...u, password: resetNewPass }
        : u,
    ));
    setResetStatus(`Password reset for ${resetToken.email} using token ${resetToken.token}.`);
  };

  useEffect(() => {
    setRequirements(`## VaultAuth — Account-Security Portal

A hardened sign-up, login, password-reset, and 2FA flow.

### Security Rules
- **Passwords** must be **at least ${MIN_PASSWORD_LENGTH} characters** — a 7-character password is rejected.
- The **strength meter** must reflect real **character variety** (length, upper-case, digit, special) — length alone is never "Strong", and no rule is double-counted.
- **Password** and **confirm-password** must match, or sign-up is rejected.
- **Email** must be a real address form (local@domain.tld); "a@b" is invalid.
- The **common-password blocklist** is **case-insensitive** — "Password" is blocked just like "password".
- **Duplicate accounts** are prevented **case-insensitively** — the same email in different case is one account.
- **Login lockout** after **${MAX_LOGIN_ATTEMPTS} failed attempts**; the counter must **persist** (a refresh must not clear it).
- Login returns a **single generic error** for a bad email or bad password — never reveal whether an email exists (no user enumeration).
- **Reset tokens** expire after **${RESET_TOKEN_TTL} ticks** and are **single-use** (invalidated once consumed).
- **2FA** requires the correct issued code — an empty or arbitrary code is rejected.
- The **session token** must carry an **expiry** and time out.

### Levels
14 bugs, difficulty levels 6-9 (boundary value, logic, state management, input validation).`);

    setDbTables({
      Users: [
        { id: 1, email: 'admin@vault.io', password: 'Sup3rSecret!', createdAt: '2026-01-02' },
      ],
      ResetTokens: [
        { id: 1, email: 'admin@vault.io', token: 'RT-SEED01', issuedAt: 0, ttl: RESET_TOKEN_TTL, used: false },
      ],
      LoginAttempts: [
        { id: 1, email: 'admin@vault.io', failed: 0, lockedUntil: null },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/login',
        description: 'Authenticates a user. (Reflects AUT-12: distinct messages leak whether the email exists — user enumeration.)',
        payloadTemplate: '{\n  "email": "admin@vault.io",\n  "password": "wrong"\n}',
        handler: (requestBody: string) => {
          try {
            const { email, password } = JSON.parse(requestBody || '{}');
            const user = SEED_USERS.find(u => u.email.toLowerCase() === String(email).toLowerCase());
            // BUG AUT-12: separate messages for unknown-email vs wrong-password.
            if (!user) return { status: 404, body: { ok: false, error: 'No account found for that email.' } };
            if (user.password !== password) return { status: 401, body: { ok: false, error: 'Incorrect password for that account.' } };
            // BUG AUT-13: session token issued with no expiry field.
            return { status: 200, body: { ok: true, session: 'sess-' + user.email } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/reset',
        description: 'Consumes a password-reset token. (Reflects AUT-03: expiry never checked, and AUT-05: used token is not invalidated.)',
        payloadTemplate: '{\n  "token": "RT-SEED01",\n  "newPassword": "N3wPass!x",\n  "ageTicks": 999\n}',
        handler: (requestBody: string) => {
          try {
            const { token, ageTicks } = JSON.parse(requestBody || '{}');
            // BUG AUT-03: ageTicks may exceed RESET_TOKEN_TTL but is never rejected.
            // BUG AUT-05: no "used" bookkeeping — the same token always succeeds.
            void ageTicks;
            void RESET_TOKEN_TTL;
            return { status: 200, body: { ok: true, reset: true, token, reusable: true } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      { bugId: 'AUT-01', title: 'Password minimum length off-by-one', location: 'AuthApp.tsx — handleSignUp()', technique: 'Boundary Value',
        buggyCode: 'if (suPass.length > 6) { /* passes */ }',
        fixedCode: 'if (suPass.length < MIN_PASSWORD_LENGTH) { reject }',
        explanation: 'Using > 6 accepts a 7-character password. Enforce length >= 8 (the policy minimum).' },
      { bugId: 'AUT-02', title: 'Strength meter double-counts a rule', location: 'AuthApp.tsx — strength()', technique: 'Logic Error',
        buggyCode: 'if (/[0-9]/.test(pw)) score++;\nif (/[0-9]/.test(pw)) score++;',
        fixedCode: 'if (/[0-9]/.test(pw)) score++;\nif (/[^A-Za-z0-9]/.test(pw)) score++;',
        explanation: 'The digit rule is counted twice, inflating the score. The second rule should test for a special character.' },
      { bugId: 'AUT-03', title: 'Reset token never expires', location: 'AuthApp.tsx — handleConsumeReset()', technique: 'Logic Error',
        buggyCode: 'void RESET_TOKEN_TTL; // expiry never checked',
        fixedCode: 'if (now - resetToken.issuedAt > RESET_TOKEN_TTL) { setResetStatus("Token expired."); return; }',
        explanation: 'The issued token is honoured forever. Reject it once its TTL has elapsed.' },
      { bugId: 'AUT-04', title: 'Rate-limit lockout off-by-one', location: 'AuthApp.tsx — handleLogin()', technique: 'Boundary Value',
        buggyCode: 'if (attempts > MAX_LOGIN_ATTEMPTS) { lock }',
        fixedCode: 'if (attempts >= MAX_LOGIN_ATTEMPTS) { lock }',
        explanation: 'Using > allows one extra attempt past the limit. Lock out at >= the maximum.' },
      { bugId: 'AUT-05', title: 'Used reset token can be reused', location: 'AuthApp.tsx — handleConsumeReset()', technique: 'State Management',
        buggyCode: 'void resetToken.used; // never invalidated',
        fixedCode: 'if (resetToken.used) { reject }\nsetResetToken({ ...resetToken, used: true });',
        explanation: 'The token is not marked used after a reset, so it can be replayed. Invalidate it on first use.' },
      { bugId: 'AUT-06', title: 'Email regex too permissive', location: 'AuthApp.tsx — isValidEmail()', technique: 'Input Validation',
        buggyCode: '/^[^@\\s]+@[^@\\s]+$/',
        fixedCode: '/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/',
        explanation: 'The pattern accepts "a@b" with no dotted domain. Require a proper local@domain.tld form.' },
      { bugId: 'AUT-07', title: '2FA accepts any / empty code', location: 'AuthApp.tsx — handleVerify2fa()', technique: 'Input Validation',
        buggyCode: 'void twoFaInput; // never compared\nsetTwoFaStatus("verified");',
        fixedCode: 'if (twoFaInput !== issuedCode) { setTwoFaStatus("Invalid code."); return; }',
        explanation: 'The 2FA code is never checked, so any or no code grants access. Compare it to the issued code.' },
      { bugId: 'AUT-08', title: 'Confirm-password mismatch not caught', location: 'AuthApp.tsx — handleSignUp()', technique: 'Logic Error',
        buggyCode: 'void suConfirm; // never compared',
        fixedCode: 'if (suPass !== suConfirm) { setSuStatus("Passwords do not match."); return; }',
        explanation: 'A mismatched confirmation passes silently. Reject sign-up when the two fields differ.' },
      { bugId: 'AUT-09', title: 'Lockout counter resets on refresh', location: 'AuthApp.tsx — attempts state', technique: 'State Management',
        buggyCode: 'const [attempts, setAttempts] = useState(0);',
        fixedCode: 'persist failed attempts per email (LoginAttempts store) and rehydrate on mount',
        explanation: 'The counter is in-memory and reseeds to 0 on refresh, so a reload clears the lockout. Persist it.' },
      { bugId: 'AUT-10', title: 'Email case-comparison inconsistent', location: 'AuthApp.tsx — handleSignUp() vs handleLogin()', technique: 'Logic Error',
        buggyCode: 'signup: u.email === suEmail\nlogin: u.email.toLowerCase() === liEmail.toLowerCase()',
        fixedCode: 'compare case-insensitively in BOTH places',
        explanation: 'Sign-up compares case-sensitively while login is case-insensitive, letting a differently-cased email create a duplicate account.' },
      { bugId: 'AUT-11', title: 'Common-password blocklist bypassable', location: 'AuthApp.tsx — isCommonPassword()', technique: 'Logic Error',
        buggyCode: 'COMMON_PASSWORDS.includes(pw)',
        fixedCode: 'COMMON_PASSWORDS.includes(pw.toLowerCase())',
        explanation: 'The list is lowercase but the check is case-sensitive, so "Password" is not blocked. Normalise case first.' },
      { bugId: 'AUT-12', title: 'Login leaks whether email exists', location: 'AuthApp.tsx — handleLogin()', technique: 'Logic Error',
        buggyCode: '!user -> "No account found"\nbad pw -> "Incorrect password"',
        fixedCode: 'both cases -> "Invalid email or password."',
        explanation: 'Distinct messages let an attacker enumerate valid accounts. Return one generic error for both failures.' },
      { bugId: 'AUT-13', title: 'Session token has no expiry', location: 'AuthApp.tsx — handleLogin()', technique: 'Boundary Value',
        buggyCode: 'setSession({ email, issuedAt: now });',
        fixedCode: 'setSession({ email, issuedAt: now, expiresAt: now + SESSION_TTL });',
        explanation: 'The session is stamped without an expiry, so it never times out. Add and enforce an expiry.' },
      { bugId: 'AUT-14', title: 'Strength meter rewards length alone', location: 'AuthApp.tsx — strength()', technique: 'Logic Error',
        buggyCode: 'if (pw.length >= 12) return { score: 4, label: "Strong" };',
        fixedCode: 'derive strength from character variety, not length by itself',
        explanation: '"aaaaaaaaaaaa" is labelled Strong purely for its length. Strength must require character variety.' },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const inputStyle = { marginBottom: '1rem' };

  const advanceClock = () => setNow(n => n + 10);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>VaultAuth</h1>
          <p>Account-security portal: sign-up, login, reset, and 2FA. (Difficulty: Expert)</p>
        </div>
        <button className="btn btn-secondary" onClick={advanceClock} data-testid="advance-clock">
          Advance clock (now: {now})
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Sign-up */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} /> Create Account
          </h2>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="su-email">Email</label>
            <input id="su-email" type="email" className="input-field" value={suEmail} onChange={e => setSuEmail(e.target.value)} />
          </div>
          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="su-pass">Password</label>
            <input id="su-pass" type="password" className="input-field" value={suPass} onChange={e => setSuPass(e.target.value)} />
          </div>
          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="su-confirm">Confirm password</label>
            <input id="su-confirm" type="password" className="input-field" value={suConfirm} onChange={e => setSuConfirm(e.target.value)} />
          </div>

          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Strength: <strong data-testid="strength-label">{suPass ? suStrength.label : '—'}</strong> ({suStrength.score}/4)
          </p>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSignUp}>
            Sign Up
          </button>
          {suStatus && <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }} data-testid="signup-status">{suStatus}</p>}
        </div>

        {/* Login + 2FA */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogIn size={20} /> Sign In
          </h2>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="li-email">Email</label>
            <input id="li-email" type="email" className="input-field" value={liEmail} onChange={e => setLiEmail(e.target.value)} />
          </div>
          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="li-pass">Password</label>
            <input id="li-pass" type="password" className="input-field" value={liPass} onChange={e => setLiPass(e.target.value)} />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLogin}>
            Log In
          </button>
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Failed attempts: <span data-testid="attempts">{attempts}</span> / {MAX_LOGIN_ATTEMPTS}
          </p>
          {liStatus && <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }} data-testid="login-status">{liStatus}</p>}
          {session && <p style={{ marginTop: '0.5rem', color: 'var(--success)' }} data-testid="session-status">Session active for {session.email}</p>}

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1.25rem 0' }} />

          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Smartphone size={16} /> Two-Factor Code
          </h3>
          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="twofa">6-digit code</label>
            <input id="twofa" type="text" className="input-field" value={twoFaInput} onChange={e => setTwoFaInput(e.target.value)} placeholder="123456" />
          </div>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleVerify2fa}>
            Verify Code
          </button>
          {twoFaStatus && <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }} data-testid="twofa-status">{twoFaStatus}</p>}
        </div>

        {/* Forgot password / reset */}
        <div className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={20} /> Forgot Password
          </h2>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ ...inputStyle, flex: 1, minWidth: '200px' }}>
              <label className="input-label" htmlFor="reset-email">Account email</label>
              <input id="reset-email" type="email" className="input-field" value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-secondary" onClick={handleIssueReset}>Issue Reset Token</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ ...inputStyle, flex: 1, minWidth: '200px' }}>
              <label className="input-label" htmlFor="reset-token">Reset token</label>
              <input id="reset-token" type="text" className="input-field" value={resetTokenInput} onChange={e => setResetTokenInput(e.target.value)} />
            </div>
            <div className="input-group" style={{ ...inputStyle, flex: 1, minWidth: '200px' }}>
              <label className="input-label" htmlFor="reset-newpass">New password</label>
              <input id="reset-newpass" type="password" className="input-field" value={resetNewPass} onChange={e => setResetNewPass(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={handleConsumeReset}>Reset Password</button>
            </div>
          </div>

          {resetStatus && <p style={{ color: 'var(--text-muted)' }} data-testid="reset-status">{resetStatus}</p>}
        </div>
      </div>
    </div>
  );
};

export const AuthApp = () => (
  <QALayout>
    <AuthInner />
  </QALayout>
);
