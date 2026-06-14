import { useState, useEffect } from 'react';
import { ArrowLeft, User, Lock, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

type Step = 1 | 2 | 3;

interface FormErrors {
  [key: string]: string;
}

// Seed users used to detect duplicate emails (REG-14). The check is intentionally
// never performed against this list, so "existing@devportal.com" can re-register.
const USERS_TABLE = [
  { id: 1, username: 'jdoe', email: 'existing@devportal.com', created: '2025-01-12' },
  { id: 2, username: 'asmith', email: 'alice@devportal.com', created: '2025-03-04' },
];

// Email regex used by validation and the validate-email endpoint (REG-03).
const EMAIL_REGEX = /.+@.+/;

const RegistrationInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Step 1 — Personal
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');

  // Step 2 — Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [zip, setZip] = useState('');

  // Step 3 — Review
  const [agreedTerms, setAgreedTerms] = useState(false);

  // BUG REG-07 (Stale State): email is snapshotted when advancing to Step 3. If
  // the user goes Back and edits the email, Step 3 keeps showing the old value.
  const [reviewEmail, setReviewEmail] = useState('');

  // BUG REG-12 (Stale State): the progress indicator is tracked in its own state
  // and only bumped forward in handleNext. handleBack does NOT decrement it, so
  // after going back the indicator still highlights the higher step.
  const [progressStep, setProgressStep] = useState<Step>(1);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateStep1 = (): boolean => {
    const errs: FormErrors = {};

    // BUG REG-01 (Boundary Value): first name minimum is 2 chars, but the check
    // uses < 1 instead of < 2, so a single character passes.
    // BUG REG-11 (Missing Validation): no .trim(), so "  " (whitespace) passes.
    if (firstName.length < 1) {
      errs.firstName = 'First name is required.';
    }

    // BUG REG-02 (Boundary Value): last name maximum is 50 chars, but there is
    // NO maximum length check — any length is accepted.
    // BUG REG-11: whitespace-only also passes here.
    if (lastName.length < 1) {
      errs.lastName = 'Last name is required.';
    }

    // BUG REG-08 (Boundary Value): age must be >= 18, but only NaN is rejected,
    // so 0 and negative numbers are accepted.
    const ageNum = Number(age);
    if (age === '' || Number.isNaN(ageNum)) {
      errs.age = 'Age is required.';
    }

    // BUG REG-13 (Boundary Value): username max length is 20, but there is no
    // maximum check — more than 20 characters is accepted.
    if (username.length < 4) {
      errs.username = 'Username must be at least 4 characters.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: FormErrors = {};

    // BUG REG-03 (Equivalence Partitioning): regex /.+@.+/ is too permissive —
    // it accepts "a@b", "@b.com", "x@", etc.
    if (!EMAIL_REGEX.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }

    // BUG REG-14 (Logic Bug): duplicate email is never checked against
    // USERS_TABLE, so "existing@devportal.com" registers again. The check below
    // is intentionally absent.

    // BUG REG-04 (Regex Flaw): password requires min 8, 1 uppercase, 1 number,
    // but the uppercase check is missing — only length and a digit are checked.
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/[0-9]/.test(password)) {
      errs.password = 'Password must contain at least one number.';
      // Missing: !/[A-Z]/.test(password) check never runs.
    }

    // BUG REG-05 (Logic Bug): .trim() is applied only to confirmPassword, so
    // "secret1 " and "secret1" are treated as equal.
    if (password !== confirmPassword.trim()) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    // BUG REG-06 (Input Type): phone is type="text" and validation only checks
    // non-empty, not digits — "hello" is accepted.
    if (phone.trim() === '') {
      errs.phone = 'Phone number is required.';
    }

    // BUG REG-09 (Equivalence Partitioning): ZIP should be 5 digits, but only
    // non-empty is checked, so letters like "ABCDE" pass.
    if (zip.trim() === '') {
      errs.zip = 'ZIP / postal code is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Navigation ────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setProgressStep(2);
    } else if (step === 2 && validateStep2()) {
      // BUG REG-07: snapshot taken here becomes stale if email is later edited.
      setReviewEmail(email);
      setStep(3);
      setProgressStep(3);
    }
  };

  const handleBack = () => {
    setErrors({});
    // BUG REG-12: progressStep is intentionally NOT decremented here.
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSubmit = () => {
    // BUG REG-10 (Logic Bug): the terms checkbox is not required — submission
    // proceeds even when agreedTerms is false.
    setSubmitted(true);
  };

  // ─── QA Panel wiring ─────────────────────────────────────────────────────────

  useEffect(() => {
    setRequirements(`## Registration Portal — "DevPortal"

A multi-step sign-up form: **Personal** → **Account** → **Review**.

### Functional Requirements
- **First name**: required, **minimum 2 characters**.
- **Last name**: required, **maximum 50 characters**.
- **Age**: required, must be a number **>= 18** (no zero or negative values).
- **Username**: required, **4–20 characters** (enforce a maximum of 20).
- **Email**: required, must be a **valid RFC-style address** (user@domain.tld).
- **Email** must be **unique** — checked against existing users (Users_Table).
- **Password**: minimum **8 chars**, at least **1 uppercase** and **1 number**.
- **Confirm password** must match the password **exactly** (no trimming).
- **Phone**: required and **numeric** (digits/dashes/parentheses only).
- **ZIP / postal code**: required and **numeric**.
- **Terms checkbox** must be **checked** before the account can be created.
- Required fields must reject **whitespace-only** input.
- The **Review** step must show the **live** email after editing.
- The **step progress indicator** must reflect the **current** step (including after going Back).

### Levels
14 bugs, difficulty levels 3-6 (boundary, equivalence, regex flaw, input type, missing validation, stale state, logic).`);

    setDbTables({
      Users_Table: USERS_TABLE,
      Validation_Rules: [
        { field: 'firstName', rule: 'minLength', value: 2 },
        { field: 'lastName', rule: 'maxLength', value: 50 },
        { field: 'age', rule: 'min', value: 18 },
        { field: 'username', rule: 'length', value: '4-20' },
        { field: 'email', rule: 'format', value: 'RFC email + unique' },
        { field: 'password', rule: 'pattern', value: 'min8 + 1 upper + 1 number' },
        { field: 'phone', rule: 'numeric', value: true },
        { field: 'zip', rule: 'numeric', value: true },
        { field: 'terms', rule: 'required', value: true },
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
        bugId: 'REG-01', title: 'First name accepts a single character', location: 'RegistrationApp.tsx — validateStep1()',
        technique: 'Boundary Value',
        buggyCode: 'if (firstName.length < 1) { errs.firstName = "First name is required."; }',
        fixedCode: 'if (firstName.trim().length < 2) { errs.firstName = "First name must be at least 2 characters."; }',
        explanation: 'Minimum is 2 chars but the check uses < 1, so one character passes. Compare against 2.',
      },
      {
        bugId: 'REG-02', title: 'Last name has no maximum length limit', location: 'RegistrationApp.tsx — validateStep1()',
        technique: 'Boundary Value',
        buggyCode: 'if (lastName.length < 1) { errs.lastName = "Last name is required."; }\n// no maximum check',
        fixedCode: 'if (lastName.trim().length < 1) { errs.lastName = "Last name is required."; }\nelse if (lastName.length > 50) { errs.lastName = "Max 50 characters."; }',
        explanation: 'No upper bound is enforced, so a 200-char last name is accepted. Reject length > 50.',
      },
      {
        bugId: 'REG-03', title: 'Email validation accepts invalid addresses', location: 'RegistrationApp.tsx — EMAIL_REGEX',
        technique: 'Equivalence Partitioning',
        buggyCode: 'const EMAIL_REGEX = /.+@.+/;',
        fixedCode: 'const EMAIL_REGEX = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;',
        explanation: '/.+@.+/ accepts "a@b" and "@b.com". Require a local part, domain, and TLD.',
      },
      {
        bugId: 'REG-04', title: 'Password does not require an uppercase letter', location: 'RegistrationApp.tsx — validateStep2()',
        technique: 'Regex Flaw',
        buggyCode: 'else if (!/[0-9]/.test(password)) { errs.password = "...one number."; }',
        fixedCode: 'else if (!/[0-9]/.test(password) || !/[A-Z]/.test(password)) {\n  errs.password = "Need 1 number and 1 uppercase.";\n}',
        explanation: 'The uppercase requirement is never checked, so "password1" passes. Add /[A-Z]/.',
      },
      {
        bugId: 'REG-05', title: 'Confirm password trims only one side', location: 'RegistrationApp.tsx — validateStep2()',
        technique: 'Logic Bug',
        buggyCode: 'if (password !== confirmPassword.trim()) {',
        fixedCode: 'if (password !== confirmPassword) {',
        explanation: 'Trimming only confirmPassword makes "secret1 " equal "secret1". Compare exactly.',
      },
      {
        bugId: 'REG-06', title: 'Phone field accepts letters and symbols', location: 'RegistrationApp.tsx — validateStep2() / phone input',
        technique: 'Input Type',
        buggyCode: '<input type="text" .../>\nif (phone.trim() === "") { errs.phone = "..."; }',
        fixedCode: 'if (!/^[0-9()+\\-\\s]{7,}$/.test(phone)) { errs.phone = "Numeric phone required."; }',
        explanation: 'A type="text" field with a non-empty-only check accepts "hello". Validate digits.',
      },
      {
        bugId: 'REG-07', title: 'Review shows stale email after going back', location: 'RegistrationApp.tsx — reviewEmail snapshot',
        technique: 'Stale State',
        buggyCode: 'setReviewEmail(email); // snapshot taken once\n... value={reviewEmail}',
        fixedCode: 'Read live state in Review: value={email} (drop the snapshot).',
        explanation: 'The snapshot desyncs after the user edits email on Step 2. Render live state.',
      },
      {
        bugId: 'REG-08', title: 'Age accepts zero and negative numbers', location: 'RegistrationApp.tsx — validateStep1()',
        technique: 'Boundary Value',
        buggyCode: 'if (age === "" || Number.isNaN(ageNum)) { errs.age = "Age is required."; }',
        fixedCode: 'if (age === "" || Number.isNaN(ageNum) || ageNum < 18) { errs.age = "Must be 18 or older."; }',
        explanation: 'Only empty/NaN is rejected, so 0 and -5 pass. Enforce ageNum >= 18.',
      },
      {
        bugId: 'REG-09', title: 'ZIP / postal code accepts letters', location: 'RegistrationApp.tsx — validateStep2()',
        technique: 'Equivalence Partitioning',
        buggyCode: 'if (zip.trim() === "") { errs.zip = "ZIP / postal code is required."; }',
        fixedCode: 'if (!/^[0-9]{5}$/.test(zip)) { errs.zip = "ZIP must be 5 digits."; }',
        explanation: 'Only non-empty is checked, so "ABCDE" passes. Require a 5-digit numeric code.',
      },
      {
        bugId: 'REG-10', title: 'Terms checkbox is not required', location: 'RegistrationApp.tsx — handleSubmit()',
        technique: 'Logic Bug',
        buggyCode: 'const handleSubmit = () => { setSubmitted(true); };',
        fixedCode: 'const handleSubmit = () => {\n  if (!agreedTerms) { setErrors({ terms: "You must accept the terms." }); return; }\n  setSubmitted(true);\n};',
        explanation: 'Submission ignores agreedTerms. Block submit until the box is checked.',
      },
      {
        bugId: 'REG-11', title: 'Required fields accept whitespace-only input', location: 'RegistrationApp.tsx — validateStep1()',
        technique: 'Missing Validation',
        buggyCode: 'if (firstName.length < 1) { ... }\nif (lastName.length < 1) { ... }',
        fixedCode: 'if (firstName.trim().length < 2) { ... }\nif (lastName.trim().length < 1) { ... }',
        explanation: 'Length checks without .trim() let "   " pass as a value. Trim before measuring.',
      },
      {
        bugId: 'REG-12', title: 'Step progress indicator wrong after back', location: 'RegistrationApp.tsx — handleBack() / progressStep',
        technique: 'Stale State',
        buggyCode: 'const handleBack = () => { if (step === 3) setStep(2); }; // progressStep unchanged',
        fixedCode: 'Derive progress from step: progressStep === step. Or decrement progressStep in handleBack.',
        explanation: 'progressStep only advances; it is never decremented, so the bar stays ahead. Derive it from step.',
      },
      {
        bugId: 'REG-13', title: 'Username has no maximum length', location: 'RegistrationApp.tsx — validateStep1()',
        technique: 'Boundary Value',
        buggyCode: 'if (username.length < 4) { errs.username = "...at least 4 characters."; }',
        fixedCode: 'if (username.length < 4 || username.length > 20) { errs.username = "Username must be 4-20 chars."; }',
        explanation: 'Only a minimum is checked, so a 40-char username passes. Enforce the 20-char maximum.',
      },
      {
        bugId: 'REG-14', title: 'Duplicate email is not checked', location: 'RegistrationApp.tsx — validateStep2()',
        technique: 'Logic Bug',
        buggyCode: '// no uniqueness check against Users_Table',
        fixedCode: 'if (USERS_TABLE.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {\n  errs.email = "Email already registered.";\n}',
        explanation: '"existing@devportal.com" can re-register because no uniqueness check runs. Compare against Users_Table.',
      },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const inputStyle = (field: string) => ({
    border: errors[field] ? '1px solid var(--danger)' : '1px solid var(--glass-border)',
  });

  if (submitted) {
    return (
      <div className="container animate-fade-in" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', display: 'inline-flex', padding: '1.5rem', borderRadius: '50%', marginBottom: '2rem' }}>
          <CheckCircle size={64} />
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Account Created!</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Welcome, <strong style={{ color: 'var(--text-main)' }}>{firstName}</strong>.</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>A verification email was sent to <strong style={{ color: 'var(--text-main)' }}>{reviewEmail}</strong>.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Hub
        </button>
      </div>
    );
  }

  const steps = [
    { n: 1 as Step, label: 'Personal', icon: <User size={14} /> },
    { n: 2 as Step, label: 'Account', icon: <Lock size={14} /> },
    { n: 3 as Step, label: 'Review', icon: <CheckCircle size={14} /> },
  ];

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '640px', paddingBottom: '4rem' }}>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Create Account</h1>
        <p>DevPortal Registration — (Difficulty: Medium, Levels 3–6)</p>
      </div>

      {/* Progress Bar — BUG REG-12: highlights via progressStep, not step */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {steps.map(s => (
          <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{
              height: '4px', borderRadius: '2px',
              background: progressStep >= s.n ? 'var(--primary)' : 'var(--glass-border)',
              transition: 'background 0.3s',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: progressStep >= s.n ? 'var(--primary)' : 'var(--text-disabled)', fontWeight: progressStep === s.n ? 600 : 400 }}>
              {s.icon} {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Personal ── */}
      {step === 1 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Personal Information</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">First Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              {/* BUG REG-01 / REG-11 */}
              <input className="input-field" style={inputStyle('firstName')} type="text" value={firstName}
                onChange={e => setFirstName(e.target.value)} placeholder="Min. 2 characters" />
              {errors.firstName && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.firstName}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Last Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              {/* BUG REG-02: no maxLength */}
              <input className="input-field" style={inputStyle('lastName')} type="text" value={lastName}
                onChange={e => setLastName(e.target.value)} placeholder="Max. 50 characters" />
              {errors.lastName && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.lastName}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Age <span style={{ color: 'var(--danger)' }}>*</span></label>
              {/* BUG REG-08: accepts 0 / negative */}
              <input className="input-field" style={inputStyle('age')} type="number" value={age}
                onChange={e => setAge(e.target.value)} placeholder="18+" />
              {errors.age && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.age}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Username <span style={{ color: 'var(--danger)' }}>*</span></label>
              {/* BUG REG-13: no max length */}
              <input className="input-field" style={inputStyle('username')} type="text" value={username}
                onChange={e => setUsername(e.target.value)} placeholder="4–20 characters" />
              {errors.username && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.username}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Account ── */}
      {step === 2 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Account Credentials</h2>

          <div className="input-group">
            <label className="input-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
            {/* BUG REG-03 (permissive regex) & REG-14 (no duplicate check) */}
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
              {/* BUG REG-06: type="text" accepts letters */}
              <input className="input-field" style={inputStyle('phone')} type="text" value={phone}
                onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
              {errors.phone && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.phone}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">ZIP / Postal <span style={{ color: 'var(--danger)' }}>*</span></label>
              {/* BUG REG-09: accepts letters */}
              <input className="input-field" style={inputStyle('zip')} type="text" value={zip}
                onChange={e => setZip(e.target.value)} placeholder="5 digits" />
              {errors.zip && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.zip}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && (
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
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={handleBack} style={{ visibility: step > 1 ? 'visible' : 'hidden' }}>
          <ChevronLeft size={18} /> Back
        </button>

        {step < 3 ? (
          <button type="button" className="btn btn-primary" onClick={handleNext}>
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            <CheckCircle size={18} /> Create Account
          </button>
        )}
      </div>
    </div>
  );
};

export const RegistrationApp = () => (
  <QALayout>
    <RegistrationInner />
  </QALayout>
);
