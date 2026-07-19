import { useEffect, useState } from 'react';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { VERIFICATION_CODES } from '../context/RegistrationContext';

// The code "sent" to the user. Compare against what the tester types.
const SENT_CODE = VERIFICATION_CODES[0];

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [resends, setResends] = useState(0);

  useEffect(() => {
    setRequirements(`## Registration — Verify Email
URL: \`/registration/verify\`

### Functional Requirements
- The 6-digit code must match **exactly** — including leading zeros.
- An **expired** code (see \`expiresAt\` in the DB viewer) must be rejected.
- The code field must accept **exactly 6 digits** (no letters, no other lengths).
- **Resend code** must be rate-limited (cooldown between sends).
- Mobile keyboards should show a numeric keypad and support one-time-code autofill.

### Bug Hints (5 bugs on this page):
- 🐛 **Level 5 (Equivalence):** The sent code is \`042519\` (see DB viewer). Try entering \`42519\` — five digits, no leading zero. Accepted?
- 🐛 **Level 5 (Logic):** Look at the code's \`expiresAt\` in the DB viewer — it's in the past. Does the "valid" code still work?
- 🐛 **Level 3 (Boundary):** Type letters or a 20-character string into the code field. Any complaint before you press Verify?
- 🐛 **Level 4 (Abuse):** Click "Resend code" ten times in a row. Any cooldown? Check \`Resend_Log\`.
- 🐛 **Level 2 (Mobile):** Inspect the code input — does it have \`inputMode="numeric"\` and \`autocomplete="one-time-code"\`?`);

    setDbTables({
      Verification_Codes: [SENT_CODE],
      Resend_Log: resends === 0
        ? [{ note: 'No resends yet.' }]
        : Array.from({ length: resends }, (_, i) => ({ resend: i + 1, at: new Date().toISOString() })),
    });

    setApiEndpoints([
      {
        method: 'POST', path: '/api/register/verify',
        description: 'Verifies the emailed code. (Reflects the numeric-comparison and missing-expiry bugs.)',
        payloadTemplate: '{\n  "code": "42519"\n}',
        handler: (requestBody: string) => {
          try {
            const { code: c } = JSON.parse(requestBody || '{}');
            // BUG REG-31: numeric comparison — Number('42519') === Number('042519').
            // BUG REG-32: expiresAt is never checked.
            const valid = Number(c) === Number(SENT_CODE.code);
            return { status: valid ? 200 : 422, body: { code: c, verified: valid } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ]);

    const solutions: BugSolution[] = [
      {
        bugId: 'REG-30', title: 'Code field accepts letters and any length', location: 'VerifyEmail.tsx — code input',
        technique: 'Boundary Value',
        buggyCode: '<input type="text" value={code} onChange={...} /> // no maxLength, no pattern',
        fixedCode: '<input type="text" maxLength={6} pattern="[0-9]{6}" value={code} onChange={...} />',
        explanation: 'Anything can be typed into the 6-digit code field — no format constraint exists before submission.',
      },
      {
        bugId: 'REG-31', title: 'Codes are compared numerically — leading zeros are ignored', location: 'VerifyEmail.tsx — handleVerify()',
        technique: 'Equivalence Partitioning',
        buggyCode: 'const valid = Number(code) === Number(SENT_CODE.code);\n// Number("42519") === Number("042519") → true',
        fixedCode: 'const valid = code.trim() === SENT_CODE.code;',
        explanation: 'Casting both sides to Number strips leading zeros, so the 5-digit "42519" wrongly verifies against the sent code "042519". Compare as strings.',
      },
      {
        bugId: 'REG-32', title: 'Expired verification codes are still accepted', location: 'VerifyEmail.tsx — handleVerify()',
        technique: 'Logic Bug',
        buggyCode: 'const valid = Number(code) === Number(SENT_CODE.code);\n// SENT_CODE.expiresAt is never read',
        fixedCode: 'if (new Date(SENT_CODE.expiresAt) < new Date()) return setStatus("Code expired — request a new one.");',
        explanation: 'The DB clearly marks the code EXPIRED (expiresAt in the past), but verification never checks it.',
      },
      {
        bugId: 'REG-33', title: 'Resend code has no cooldown', location: 'VerifyEmail.tsx — handleResend()',
        technique: 'Abuse / Rate Limiting',
        buggyCode: 'const handleResend = () => setResends(c => c + 1); // fires on every click',
        fixedCode: 'Disable the button for 30–60s after each send (cooldown timer).',
        explanation: 'Ten rapid clicks queue ten "emails" (see Resend_Log) — a spam and cost vector in a real system.',
      },
      {
        bugId: 'REG-34', title: 'Code input lacks inputMode and one-time-code autofill', location: 'VerifyEmail.tsx — code input',
        technique: 'Mobile UX',
        buggyCode: '<input type="text" value={code} ... />',
        fixedCode: '<input type="text" inputMode="numeric" autoComplete="one-time-code" value={code} ... />',
        explanation: 'Without inputMode="numeric" and autocomplete="one-time-code", mobile users get a full keyboard and lose OS-level SMS/email code autofill.',
      },
    ];
    setSolutions(solutions);
  }, [resends, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const handleVerify = () => {
    // BUG REG-31: numeric comparison ignores leading zeros.
    // BUG REG-32: expiresAt is intentionally never checked.
    if (Number(code) === Number(SENT_CODE.code)) {
      setStatus('Verified! Your email address is confirmed.');
    } else {
      setStatus('Error: Invalid verification code.');
    }
  };

  // BUG REG-33: no cooldown between resends.
  const handleResend = () => {
    setResends(c => c + 1);
    setStatus(`A new code was sent. (${resends + 1} sent so far)`);
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '480px', paddingBottom: '4rem' }}>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/registration')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Registration
      </button>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <MailCheck size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Verify your email</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter the 6-digit code we sent to your inbox.
        </p>

        {/* BUG REG-30: no maxLength/pattern; BUG REG-34: no inputMode/autocomplete */}
        <input
          className="input-field"
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="6-digit code"
          style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.35rem', marginBottom: '1rem' }}
        />

        <button type="button" className="btn btn-primary" style={{ width: '100%', marginBottom: '0.75rem' }} onClick={handleVerify}>
          Verify
        </button>
        {/* BUG REG-33: no cooldown */}
        <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={handleResend}>
          Resend code
        </button>

        {status && (
          <div style={{
            marginTop: '1.25rem', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem',
            background: status.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: status.includes('Error') ? 'var(--danger)' : 'var(--success)', fontWeight: 500,
          }}>{status}</div>
        )}
      </div>
    </div>
  );
};
