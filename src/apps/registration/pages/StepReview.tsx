import { useEffect } from 'react';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useRegistration, USERS_TABLE } from '../context/RegistrationContext';
import { WizardChrome } from './WizardChrome';

export const StepReview = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const {
    firstName, lastName, age, username, email, phone, zip,
    agreedTerms, setAgreedTerms, reviewEmail, errors, setErrors, registerAccount,
  } = useRegistration();

  useEffect(() => {
    setRequirements(`## Registration — Step 3: Review
URL: \`/registration/review\`

### Functional Requirements
- The review must show the **live, current** values — including email edited after going Back.
- The **Terms checkbox** must be checked before the account can be created.
- The **step progress indicator** must reflect the current step, including after going Back.
- "Create Account" must be protected against **double submission**.
- This step must not be reachable by URL with an empty wizard.

### Bug Hints (5 bugs on this step):
- 🐛 **Level 5 (Stale State):** Go **Back**, change your email on Step 2, return here. Which email does the review show?
- 🐛 **Level 4 (Logic):** Leave the Terms checkbox **unchecked** and click Create Account. Does it stop you?
- 🐛 **Level 5 (Stale State):** From here click **Back** and look at the progress bar at the top. Which step does it highlight?
- 🐛 **Level 6 (Race):** Double-click **Create Account** very fast, then check the \`Registrations_Log\` in the DB viewer. How many accounts were created?
- 🐛 **Level 4 (Routing):** Open \`/registration/review\` directly in a fresh tab. Can you submit a completely empty registration?`);

    setDbTables({
      Users_Table: USERS_TABLE,
      Review_Snapshot: [{
        fullName: `${firstName} ${lastName}`.trim() || '(empty)',
        liveEmail: email || '(empty)',
        shownEmail: reviewEmail || '(empty)',
        note: 'liveEmail vs shownEmail — do they match after editing on Step 2?',
      }],
    });
    setApiEndpoints([]);

    const solutions: BugSolution[] = [
      {
        bugId: 'REG-07', title: 'Review shows stale email after going back', location: 'StepAccount.tsx — reviewEmail snapshot',
        technique: 'Stale State',
        buggyCode: 'setReviewEmail(email); // snapshot taken once on Next\n... value={reviewEmail}',
        fixedCode: 'Read live state in Review: value={email} (drop the snapshot).',
        explanation: 'The snapshot desyncs after the user edits email on Step 2. Render live state.',
      },
      {
        bugId: 'REG-10', title: 'Terms checkbox is not required', location: 'StepReview.tsx — handleSubmit()',
        technique: 'Logic Bug',
        buggyCode: 'const handleSubmit = () => { registerAccount(); navigate("/registration/success"); };',
        fixedCode: 'const handleSubmit = () => {\n  if (!agreedTerms) { setErrors({ terms: "You must accept the terms." }); return; }\n  registerAccount(); navigate("/registration/success");\n};',
        explanation: 'Submission ignores agreedTerms. Block submit until the box is checked.',
      },
      {
        bugId: 'REG-12', title: 'Step progress indicator wrong after back', location: 'StepAccount/StepReview — handleBack() / progressStep',
        technique: 'Stale State',
        buggyCode: 'const handleBack = () => { navigate("/registration/account"); }; // progressStep unchanged',
        fixedCode: 'Derive progress from the current route instead of separate state.',
        explanation: 'progressStep only advances; it is never decremented, so the bar stays ahead after going Back. Derive it from the route.',
      },
      {
        bugId: 'REG-25', title: 'Review is reachable by URL with an empty wizard', location: 'index.tsx routes / StepReview.tsx',
        technique: 'Routing Guard',
        buggyCode: '<Route path="review" element={<StepReview />} />\n// no guard — renders "(empty)" rows and still lets you submit',
        fixedCode: 'if (!email || !username) return <Navigate to="/registration" replace />;',
        explanation: 'Deep-linking to /registration/review with no prior data shows empty values and still allows Create Account to succeed.',
      },
      {
        bugId: 'REG-26', title: 'Double-click on Create Account registers twice', location: 'StepReview.tsx — submit button',
        technique: 'Race Condition',
        buggyCode: '<button onClick={handleSubmit}>Create Account</button>\n// no disabled/submitting state',
        fixedCode: 'const [submitting, setSubmitting] = useState(false);\n<button disabled={submitting} onClick={() => { setSubmitting(true); handleSubmit(); }}>',
        explanation: 'The button stays clickable during submission — a fast double-click creates two accounts (see Registrations_Log on the Success page).',
      },
    ];
    setSolutions(solutions);
  }, [firstName, lastName, email, reviewEmail, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const handleBack = () => {
    setErrors({});
    // BUG REG-12: progressStep is intentionally NOT decremented here.
    navigate('/registration/account');
  };

  const handleSubmit = () => {
    // BUG REG-10: the terms checkbox is not required — submission proceeds
    // even when agreedTerms is false.
    // BUG REG-26: no submitting guard — each click registers another account.
    registerAccount();
    navigate('/registration/success');
  };

  return (
    <WizardChrome>
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Review Your Details</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Please confirm everything looks correct before submitting.
        </p>

        {([
          { label: 'Full Name', value: `${firstName} ${lastName}` },
          { label: 'Age', value: age },
          { label: 'Username', value: username },
          // BUG REG-07: reads from reviewEmail (stale) not live email
          { label: 'Email', value: reviewEmail },
          { label: 'Phone', value: phone },
          { label: 'ZIP / Postal', value: zip },
          { label: 'Password', value: '••••••••' },
        ] as const).map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--glass-border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{row.label}</span>
            <span style={{ fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}

        {/* BUG REG-10: terms checkbox not enforced on submit */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            I agree to the <strong style={{ color: 'var(--text-main)' }}>Terms of Service</strong> and Privacy Policy.
          </span>
        </label>
        {errors.terms && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'block', marginTop: '0.5rem' }}>{errors.terms}</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={handleBack}>
          <ChevronLeft size={18} /> Back
        </button>
        {/* BUG REG-26: no disabled/submitting guard */}
        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
          <CheckCircle size={18} /> Create Account
        </button>
      </div>
    </WizardChrome>
  );
};
