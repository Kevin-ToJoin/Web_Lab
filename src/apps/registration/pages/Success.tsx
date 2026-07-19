import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useRegistration } from '../context/RegistrationContext';

export const Success = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const { firstName, reviewEmail, registrations } = useRegistration();

  useEffect(() => {
    setRequirements(`## Registration — Success
URL: \`/registration/success\`

### Functional Requirements
- Must greet the user by name and confirm which email the verification was sent to.
- Success must be announced to assistive technology.
- Must offer a clear next step: **enter the verification code** (the Verify Email page exists at \`/registration/verify\`).
- Refreshing this page must not degrade the confirmation into empty text.

### Bug Hints (3 bugs on this page):
- 🐛 **Level 4 (State):** **Refresh** this page. What does "Welcome, ___" say now? And the email line?
- 🐛 **Level 3 (Accessibility):** Is the success announced to a screen reader (aria-live / focus shift)?
- 🐛 **Level 2 (Navigation):** The message says a verification email was sent — is there any link or button to actually enter the code?

*Evidence corner: the \`Registrations_Log\` below shows one row per Create Account click — cross-reference the Review step's double-submit bug (REG-26).*`);

    setDbTables({
      Registrations_Log: registrations === 0
        ? [{ note: 'No registrations recorded — did you deep-link here?' }]
        : Array.from({ length: registrations }, (_, i) => ({
            attempt: i + 1, email: reviewEmail || '(empty)', createdAt: new Date().toISOString(),
          })),
    });
    setApiEndpoints([]);

    const solutions: BugSolution[] = [
      {
        bugId: 'REG-27', title: 'Refreshing the success page degrades it to empty text', location: 'Success.tsx / RegistrationContext.tsx',
        technique: 'Stale State / Persistence',
        buggyCode: '<p>Welcome, <strong>{firstName}</strong>.</p>\n// context state resets on refresh → "Welcome, ."',
        fixedCode: '// Persist the confirmation payload (name/email) before navigating here,\n// or redirect to /registration when the wizard state is empty.',
        explanation: 'All wizard state lives in memory. A refresh renders "Welcome, ." and an empty email line instead of a coherent confirmation.',
      },
      {
        bugId: 'REG-28', title: 'Success is not announced to assistive technology', location: 'Success.tsx — heading',
        technique: 'Accessibility',
        buggyCode: '<h1>Account Created!</h1> // no aria-live, no focus() on mount',
        fixedCode: '<h1 tabIndex={-1} ref={headingRef} aria-live="polite">Account Created!</h1>\nuseEffect(() => { headingRef.current?.focus(); }, []);',
        explanation: 'A screen-reader user completing the wizard gets no announcement that the account was actually created.',
      },
      {
        bugId: 'REG-29', title: 'No path to the Verify Email page', location: 'Success.tsx — page body',
        technique: 'Missing Functionality',
        buggyCode: '<p>A verification email was sent to ...</p>\n<button onClick={() => navigate("/")}>Back to Hub</button>\n// /registration/verify exists but nothing links to it',
        fixedCode: '<button onClick={() => navigate("/registration/verify")}>Enter verification code</button>',
        explanation: 'The message promises a verification email, but the page where the code can be entered is unreachable from the normal flow.',
      },
    ];
    setSolutions(solutions);
  }, [registrations, reviewEmail, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  return (
    <div className="container animate-fade-in" style={{ textAlign: 'center', paddingTop: '5rem' }}>
      <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', display: 'inline-flex', padding: '1.5rem', borderRadius: '50%', marginBottom: '2rem' }}>
        <CheckCircle size={64} />
      </div>
      {/* BUG REG-28: no aria-live / focus management */}
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Account Created!</h1>
      {/* BUG REG-27: renders "Welcome, ." after a refresh wipes the context */}
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Welcome, <strong style={{ color: 'var(--text-main)' }}>{firstName}</strong>.</p>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>A verification email was sent to <strong style={{ color: 'var(--text-main)' }}>{reviewEmail}</strong>.</p>
      {/* BUG REG-29: no link to /registration/verify */}
      <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
        Back to Hub
      </button>
    </div>
  );
};
