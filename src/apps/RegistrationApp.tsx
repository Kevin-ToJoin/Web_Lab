import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

type Step = 1 | 2 | 3;

interface PersonalData {
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
}

interface CredentialData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

export const RegistrationApp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [personal, setPersonal] = useState<PersonalData>({
    firstName: '', lastName: '', phone: '', birthDate: '',
  });

  const [creds, setCreds] = useState<CredentialData>({
    email: '', username: '', password: '', confirmPassword: '',
  });

  // BUG LEVEL 6: Stale state — email is captured into a snapshot when advancing
  // to Step 3. If user goes Back to Step 2 and changes email, Step 3 still
  // shows the old value because it reads from this snapshot, not live state.
  const [reviewSnapshot, setReviewSnapshot] = useState<{ email: string; username: string } | null>(null);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateStep1 = (): boolean => {
    const errs: FormErrors = {};

    // BUG LEVEL 3 (Boundary Value): firstName minimum is supposed to be 2 chars.
    // Bug: condition checks < 1 instead of < 2, so a single character passes.
    if (personal.firstName.length < 1) {
      errs.firstName = 'First name is required.';
    }

    // BUG LEVEL 3 (Boundary Value): lastName maximum is 50 chars.
    // Bug: there is NO maximum length check — any length is accepted silently.
    if (personal.lastName.trim() === '') {
      errs.lastName = 'Last name is required.';
    }

    // BUG LEVEL 5 (Input Type): phone should be numeric-only.
    // Bug: field is type="text" and validation only checks that it is non-empty,
    // not that it contains only digits, dashes, or parentheses.
    if (personal.phone.trim() === '') {
      errs.phone = 'Phone number is required.';
    }

    if (!personal.birthDate) {
      errs.birthDate = 'Date of birth is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: FormErrors = {};

    // BUG LEVEL 4 (Equivalence Partitioning): Email regex is too permissive.
    // Requirement: must be a valid RFC email (user@domain.tld).
    // Bug: regex /.+@.+/ accepts "a@b", "@b.com", "x@", etc.
    const emailRegex = /.+@.+/;
    if (!emailRegex.test(creds.email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (creds.username.length < 4) {
      errs.username = 'Username must be at least 4 characters.';
    }

    // BUG LEVEL 4 (Regex Flaw): Password requirements are:
    // min 8 chars, at least 1 uppercase, at least 1 number.
    // Bug: only checks for a digit — uppercase requirement is completely missing.
    if (creds.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/[0-9]/.test(creds.password)) {
      errs.password = 'Password must contain at least one number.';
      // Missing: !/[A-Z]/.test(creds.password) check never runs!
    }

    // BUG LEVEL 5 (Validation Logic): Passwords should match exactly.
    // Bug: .trim() is applied only to confirmPassword, so "secret1 " and "secret1"
    // are treated as equal — trailing spaces are silently ignored.
    if (creds.password !== creds.confirmPassword.trim()) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Navigation ────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      // BUG LEVEL 6: Snapshot is taken here — if user goes back and changes
      // email/username, reviewSnapshot becomes stale.
      setReviewSnapshot({ email: creds.email, username: creds.username });
      setStep(3);
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSubmit = () => setSubmitted(true);

  // ─── Styles ────────────────────────────────────────────────────────────────

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
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Welcome, <strong style={{ color: 'var(--text-main)' }}>{personal.firstName}</strong>.</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>A verification email was sent to <strong style={{ color: 'var(--text-main)' }}>{reviewSnapshot?.email}</strong>.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '640px', paddingBottom: '4rem' }}>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Create Account</h1>
        <p>DevPortal Registration — (Difficulty: Medium, Levels 3–6)</p>
      </div>

      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {([
          { n: 1, label: 'Personal Info', icon: <User size={14} /> },
          { n: 2, label: 'Credentials', icon: <Lock size={14} /> },
          { n: 3, label: 'Review', icon: <CheckCircle size={14} /> },
        ] as const).map(s => (
          <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{
              height: '4px', borderRadius: '2px',
              background: step >= s.n ? 'var(--primary)' : 'var(--glass-border)',
              transition: 'background 0.3s',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: step >= s.n ? 'var(--primary)' : 'var(--text-disabled)', fontWeight: step === s.n ? 600 : 400 }}>
              {s.icon} {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Personal Info ── */}
      {step === 1 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Personal Information</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">First Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="input-field" style={inputStyle('firstName')} type="text" value={personal.firstName}
                onChange={e => setPersonal(p => ({ ...p, firstName: e.target.value }))}
                placeholder="Min. 2 characters" />
              {errors.firstName && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.firstName}</span>}
            </div>
            <div className="input-group">
              <label className="input-label">Last Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              {/* BUG L3: No maxLength attribute and no backend truncation */}
              <input className="input-field" style={inputStyle('lastName')} type="text" value={personal.lastName}
                onChange={e => setPersonal(p => ({ ...p, lastName: e.target.value }))}
                placeholder="Max. 50 characters" />
              {errors.lastName && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.lastName}</span>}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Phone Number <span style={{ color: 'var(--danger)' }}>*</span></label>
            {/* BUG L5: type="text" instead of type="tel", accepts "hello world" */}
            <input className="input-field" style={inputStyle('phone')} type="text" value={personal.phone}
              onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000" />
            {errors.phone && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.phone}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Date of Birth <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input className="input-field" style={inputStyle('birthDate')} type="date" value={personal.birthDate}
              onChange={e => setPersonal(p => ({ ...p, birthDate: e.target.value }))} />
            {errors.birthDate && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.birthDate}</span>}
          </div>
        </div>
      )}

      {/* ── Step 2: Credentials ── */}
      {step === 2 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Account Credentials</h2>

          <div className="input-group">
            <label className="input-label">Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
            {/* BUG L4: Regex /.+@.+/ used in validateStep2 accepts invalid emails */}
            <input className="input-field" style={inputStyle('email')} type="email" value={creds.email}
              onChange={e => setCreds(c => ({ ...c, email: e.target.value }))}
              placeholder="you@example.com" />
            {errors.email && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.email}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Username <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input className="input-field" style={inputStyle('username')} type="text" value={creds.username}
              onChange={e => setCreds(c => ({ ...c, username: e.target.value }))}
              placeholder="Min. 4 characters" />
            {errors.username && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.username}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">
              Password <span style={{ color: 'var(--danger)' }}>*</span>
              <span style={{ color: 'var(--text-disabled)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Min. 8 chars, 1 uppercase, 1 number</span>
            </label>
            {/* BUG L4: validateStep2 only checks for digit, not uppercase */}
            <input className="input-field" style={inputStyle('password')} type="password" value={creds.password}
              onChange={e => setCreds(c => ({ ...c, password: e.target.value }))}
              placeholder="••••••••" />
            {errors.password && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.password}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Confirm Password <span style={{ color: 'var(--danger)' }}>*</span></label>
            {/* BUG L5: comparedon .trim() only on this field — "secret1 " == "secret1" */}
            <input className="input-field" style={inputStyle('confirmPassword')} type="password" value={creds.confirmPassword}
              onChange={e => setCreds(c => ({ ...c, confirmPassword: e.target.value }))}
              placeholder="••••••••" />
            {errors.confirmPassword && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.confirmPassword}</span>}
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && reviewSnapshot && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Review Your Details</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Please confirm everything looks correct before submitting.
          </p>

          {([
            { label: 'Full Name',   value: `${personal.firstName} ${personal.lastName}` },
            { label: 'Phone',       value: personal.phone },
            { label: 'Date of Birth', value: personal.birthDate },
            // BUG L6: reads from reviewSnapshot (stale) NOT from creds.email (live)
            { label: 'Email',       value: reviewSnapshot.email },
            { label: 'Username',    value: reviewSnapshot.username },
            { label: 'Password',    value: '••••••••' },
          ] as const).map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{row.label}</span>
              <span style={{ fontWeight: 500 }}>{row.value}</span>
            </div>
          ))}

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              By clicking <strong style={{ color: 'var(--text-main)' }}>Create Account</strong>, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
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

      {/* Bug summary for QA students */}
      <div className="glass-panel" style={{ marginTop: '3rem', padding: '1.5rem', borderLeft: '3px solid var(--secondary)' }}>
        <h3 style={{ color: 'var(--secondary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>🔍 QA Hints — 7 bugs hidden in this form</h3>
        <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {[
            'L3: Can you submit with a single-character first name?',
            'L3: Is there a maximum length enforced on the last name field?',
            'L4: Try submitting "a@b" as an email — is it accepted?',
            'L4: Does "password1" (no uppercase) meet the password requirements?',
            'L5: Try "secret1" and "secret1 " (trailing space) as password + confirm.',
            'L5: Enter letters or symbols in the Phone field. Is it rejected?',
            'L6: Go to Step 2, advance to Step 3, then go Back, change the email, and advance again. What does Step 3 show?',
          ].map((hint, i) => (
            <li key={i} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{hint}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
