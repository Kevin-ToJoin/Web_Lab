import { useEffect } from 'react';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../../../qa/QAContext';
import { useRegistration, USERS_TABLE } from '../context/RegistrationContext';
import { WizardChrome } from './WizardChrome';

export const StepReview = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
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

    setRemoteSolutions({ app: 'registration', bugIds: ['REG-07', 'REG-10', 'REG-12', 'REG-25', 'REG-26'] });
  }, [firstName, lastName, email, reviewEmail, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

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
