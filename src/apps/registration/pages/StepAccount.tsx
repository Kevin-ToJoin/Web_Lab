import { useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../../../qa/QAContext';
import { useRegistration, USERS_TABLE, EMAIL_REGEX } from '../context/RegistrationContext';
import { WizardChrome } from './WizardChrome';

export const StepAccount = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const {
    email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
    phone, setPhone, zip, setZip,
    errors, setErrors, validateStep2, setProgressStep, setReviewEmail,
  } = useRegistration();

  useEffect(() => {
    setRequirements(`## Registration — Step 2: Account
URL: \`/registration/account\`

### Functional Requirements
- **Email**: required, valid RFC-style address (user@domain.tld), **unique** vs Users_Table.
- **Password**: minimum **8 chars**, at least **1 uppercase** and **1 number**.
- **Confirm password** must match the password **exactly** (no trimming).
- **Phone**: required and **numeric** (digits/dashes/parentheses only); mobile keyboards should show a numeric keypad.
- **ZIP / postal code**: required and **numeric (5 digits)**.
- Email and phone must have sensible **maximum lengths**.
- This step must not be reachable by URL without completing Step 1.
- On failed validation, focus should move to the first invalid field.

### Bug Hints (10 bugs on this step):
- 🐛 **Level 4 (Equivalence):** Try the email \`a@b\` — is it accepted as valid?
- 🐛 **Level 5 (Logic):** Register with \`existing@devportal.com\` (see Users_Table in the DB viewer). Duplicate allowed?
- 🐛 **Level 4 (Regex):** Try the password \`password1\` (no uppercase). Accepted?
- 🐛 **Level 5 (Logic):** Set password \`Secret12\` and confirm \`Secret12 \` (trailing space). Do they "match"?
- 🐛 **Level 3 (Input Type):** Type \`hello\` as the phone number. Accepted?
- 🐛 **Level 4 (Equivalence):** Type \`ABCDE\` as the ZIP. Accepted?
- 🐛 **Level 3 (Boundary):** Paste a 300-character email or phone. Any length limit at all?
- 🐛 **Level 2 (Mobile):** On a phone, tap the Phone or ZIP field. Numeric keypad?
- 🐛 **Level 4 (Routing):** Open \`/registration/account\` directly in a fresh tab, skipping Step 1. Are you let in?
- 🐛 **Level 3 (Accessibility):** Submit with several invalid fields — does keyboard focus jump to the first error, or stay on the button?`);

    setDbTables({
      Users_Table: USERS_TABLE,
      Validation_Rules: [
        { field: 'email', rule: 'format', value: 'RFC email + unique' },
        { field: 'password', rule: 'pattern', value: 'min8 + 1 upper + 1 number' },
        { field: 'phone', rule: 'numeric', value: true },
        { field: 'zip', rule: 'numeric 5 digits', value: true },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/register/validate-email',
        description: 'Validates an email address. (Reflects the permissive /.+@.+/ regex bug, REG-03.)',
        payloadTemplate: '{\n  "email": "a@b"\n}',
        handler: (requestBody: string) => {
          try {
            const { email: e } = JSON.parse(requestBody || '{}');
            // BUG REG-03: /.+@.+/ accepts "a@b", "@b.com", etc.
            const valid = EMAIL_REGEX.test(String(e ?? ''));
            return { status: valid ? 200 : 422, body: { email: e, valid } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/register',
        description: 'Creates an account. (Reflects the missing duplicate-email check, REG-14.)',
        payloadTemplate: '{\n  "username": "newuser",\n  "email": "existing@devportal.com",\n  "password": "Password1"\n}',
        handler: (requestBody: string) => {
          try {
            const body = JSON.parse(requestBody || '{}');
            const e = String(body.email ?? '');
            if (!EMAIL_REGEX.test(e)) {
              return { status: 422, body: { error: 'Invalid email' } };
            }
            // BUG REG-14: no uniqueness check against USERS_TABLE — a duplicate
            // email is accepted and a second account is "created".
            return {
              status: 201,
              body: {
                created: true,
                user: { id: USERS_TABLE.length + 1, username: body.username, email: e },
                duplicateOf: USERS_TABLE.find(u => u.email === e)?.id ?? null,
              },
            };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      {
        bugId: 'REG-03', title: 'Email validation accepts invalid addresses', location: 'RegistrationContext.tsx — EMAIL_REGEX',
        technique: 'Equivalence Partitioning',
        buggyCode: 'const EMAIL_REGEX = /.+@.+/;',
        fixedCode: 'const EMAIL_REGEX = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;',
        explanation: '/.+@.+/ accepts "a@b" and "@b.com". Require a local part, domain, and TLD.',
      },
      {
        bugId: 'REG-04', title: 'Password does not require an uppercase letter', location: 'RegistrationContext.tsx — validateStep2()',
        technique: 'Regex Flaw',
        buggyCode: 'else if (!/[0-9]/.test(password)) { errs.password = "...one number."; }',
        fixedCode: 'else if (!/[0-9]/.test(password) || !/[A-Z]/.test(password)) {\n  errs.password = "Need 1 number and 1 uppercase.";\n}',
        explanation: 'The uppercase requirement is never checked, so "password1" passes. Add /[A-Z]/.',
      },
      {
        bugId: 'REG-05', title: 'Confirm password trims only one side', location: 'RegistrationContext.tsx — validateStep2()',
        technique: 'Logic Bug',
        buggyCode: 'if (password !== confirmPassword.trim()) {',
        fixedCode: 'if (password !== confirmPassword) {',
        explanation: 'Trimming only confirmPassword makes "Secret12 " equal "Secret12". Compare exactly.',
      },
      {
        bugId: 'REG-06', title: 'Phone field accepts letters and symbols', location: 'RegistrationContext.tsx — validateStep2() / phone input',
        technique: 'Input Type',
        buggyCode: '<input type="text" .../>\nif (phone.trim() === "") { errs.phone = "..."; }',
        fixedCode: 'if (!/^[0-9()+\\-\\s]{7,}$/.test(phone)) { errs.phone = "Numeric phone required."; }',
        explanation: 'A type="text" field with a non-empty-only check accepts "hello". Validate digits.',
      },
      {
        bugId: 'REG-09', title: 'ZIP / postal code accepts letters', location: 'RegistrationContext.tsx — validateStep2()',
        technique: 'Equivalence Partitioning',
        buggyCode: 'if (zip.trim() === "") { errs.zip = "ZIP / postal code is required."; }',
        fixedCode: 'if (!/^[0-9]{5}$/.test(zip)) { errs.zip = "ZIP must be 5 digits."; }',
        explanation: 'Only non-empty is checked, so "ABCDE" passes. Require a 5-digit numeric code.',
      },
      {
        bugId: 'REG-14', title: 'Duplicate email is not checked', location: 'RegistrationContext.tsx — validateStep2()',
        technique: 'Logic Bug',
        buggyCode: '// no uniqueness check against Users_Table',
        fixedCode: 'if (USERS_TABLE.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {\n  errs.email = "Email already registered.";\n}',
        explanation: '"existing@devportal.com" can re-register because no uniqueness check runs. Compare against Users_Table.',
      },
      {
        bugId: 'REG-21', title: 'Email and phone have no maximum length', location: 'StepAccount.tsx — email/phone inputs',
        technique: 'Boundary Value',
        buggyCode: '<input type="email" value={email} ... /> // no maxLength\n<input type="text" value={phone} ... /> // no maxLength',
        fixedCode: '<input type="email" maxLength={254} value={email} ... />\n<input type="text" maxLength={20} value={phone} ... />',
        explanation: 'Arbitrarily long values are accepted in both fields, with no client-side cap.',
      },
      {
        bugId: 'REG-22', title: 'Phone and ZIP lack inputMode="numeric"', location: 'StepAccount.tsx — phone/zip inputs',
        technique: 'Mobile UX',
        buggyCode: '<input type="text" value={phone} ... />\n<input type="text" value={zip} ... />',
        fixedCode: '<input type="text" inputMode="numeric" value={phone} ... />\n<input type="text" inputMode="numeric" pattern="[0-9]*" value={zip} ... />',
        explanation: 'Mobile browsers show the full text keyboard for digits-only fields, forcing a manual keyboard switch.',
      },
      {
        bugId: 'REG-23', title: 'Step 2 is reachable by URL without completing Step 1', location: 'index.tsx routes / StepAccount.tsx',
        technique: 'Routing Guard',
        buggyCode: '<Route path="account" element={<StepAccount />} />\n// no guard checking that Step 1 data exists',
        fixedCode: 'if (!firstName || !username) return <Navigate to="/registration" replace />;',
        explanation: 'Deep-linking straight to /registration/account skips Step 1 entirely — the wizard can be completed with blank personal data.',
      },
      {
        bugId: 'REG-24', title: 'Focus does not move to the first invalid field', location: 'StepAccount.tsx — handleNext()',
        technique: 'Accessibility',
        buggyCode: 'if (validateStep2()) { navigate(...); }\n// on failure, focus stays on the Next button',
        fixedCode: 'const firstError = Object.keys(errs)[0];\ndocument.getElementById(firstError)?.focus();',
        explanation: 'After a failed submit, keyboard and screen-reader users are left on the button with no guidance to the failing field.',
      },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const inputStyle = (field: string) => ({
    border: errors[field] ? '1px solid var(--danger)' : '1px solid var(--glass-border)',
  });

  const handleNext = () => {
    if (validateStep2()) {
      // BUG REG-07: snapshot taken here becomes stale if email is later edited.
      setReviewEmail(email);
      setProgressStep(3);
      navigate('/registration/review');
    }
  };

  const handleBack = () => {
    setErrors({});
    // BUG REG-12: progressStep is intentionally NOT decremented here.
    navigate('/registration');
  };

  return (
    <WizardChrome>
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Account Credentials</h2>

        <div className="input-group">
          <label className="input-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
          {/* BUG REG-03 (permissive regex), REG-14 (no duplicate check), REG-21 (no maxLength) */}
          <input className="input-field" style={inputStyle('email')} type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          {errors.email && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.email}</span>}
        </div>

        <div className="input-group">
          <label className="input-label">
            Password <span style={{ color: 'var(--danger)' }}>*</span>
            <span style={{ color: 'var(--text-disabled)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Min. 8 chars, 1 uppercase, 1 number</span>
          </label>
          {/* BUG REG-04: uppercase requirement not checked */}
          <input className="input-field" style={inputStyle('password')} type="password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          {errors.password && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.password}</span>}
        </div>

        <div className="input-group">
          <label className="input-label">Confirm Password <span style={{ color: 'var(--danger)' }}>*</span></label>
          {/* BUG REG-05: trims only confirm side */}
          <input className="input-field" style={inputStyle('confirmPassword')} type="password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          {errors.confirmPassword && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.confirmPassword}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Phone <span style={{ color: 'var(--danger)' }}>*</span></label>
            {/* BUG REG-06: type="text" accepts letters; REG-22: no inputMode */}
            <input className="input-field" style={inputStyle('phone')} type="text" value={phone}
              onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            {errors.phone && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.phone}</span>}
          </div>
          <div className="input-group">
            <label className="input-label">ZIP / Postal <span style={{ color: 'var(--danger)' }}>*</span></label>
            {/* BUG REG-09: accepts letters; REG-22: no inputMode */}
            <input className="input-field" style={inputStyle('zip')} type="text" value={zip}
              onChange={e => setZip(e.target.value)} placeholder="5 digits" />
            {errors.zip && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.zip}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={handleBack}>
          <ChevronLeft size={18} /> Back
        </button>
        {/* BUG REG-24: on failed validation, focus stays here */}
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          Next <ChevronRight size={18} />
        </button>
      </div>
    </WizardChrome>
  );
};
