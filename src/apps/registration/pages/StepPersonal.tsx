import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useRegistration, USERS_TABLE } from '../context/RegistrationContext';
import { WizardChrome } from './WizardChrome';

export const StepPersonal = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const {
    firstName, setFirstName, lastName, setLastName, age, setAge, username, setUsername,
    errors, validateStep1, setProgressStep,
  } = useRegistration();

  useEffect(() => {
    setRequirements(`## Registration — Step 1: Personal
URL: \`/registration\` — the wizard's steps each have their own URL
(\`/registration\` → \`/registration/account\` → \`/registration/review\`).

### Functional Requirements
- **First name**: required, **minimum 2 characters**, whitespace-only rejected.
- **Last name**: required, **maximum 50 characters**, whitespace-only rejected.
- **Age**: required, must be a number **>= 18** (no zero or negative values).
- **Username**: required, **4–20 characters** (enforce the maximum of 20).
- Pressing **Enter** in any field should advance to the next step (form submit).
- Refreshing the page must **not** silently discard everything the user typed.
- Labels, required state, and error messages must be exposed to assistive technology.

### Bug Hints (10 bugs on this step):
- 🐛 **Level 3 (Boundary):** Type a single letter as First Name and click Next. Accepted?
- 🐛 **Level 3 (Boundary):** Paste a 200-character Last Name. Any complaint?
- 🐛 **Level 3 (Boundary):** Enter age \`0\` or \`-5\`. Does validation catch it?
- 🐛 **Level 3 (Boundary):** Type a 40-character username. Accepted?
- 🐛 **Level 4 (Missing Validation):** Enter only spaces ("   ") as First/Last name. Accepted?
- 🐛 **Level 3 (Accessibility):** Click directly on the "First Name" label text. Does focus move to the input?
- 🐛 **Level 3 (Accessibility):** Fail validation, then check the DOM — are the error messages announced (role="alert"/aria-live)?
- 🐛 **Level 2 (UX):** Fill the fields and press **Enter**. Does the wizard advance, or does nothing happen?
- 🐛 **Level 2 (UX):** Does your browser/password manager offer to autofill the name fields? Inspect the inputs for \`autocomplete\` attributes.
- 🐛 **Level 5 (State):** Fill everything, go to Step 2, then **refresh the browser**. What happened to your data?`);

    setDbTables({
      Users_Table: USERS_TABLE,
      Validation_Rules: [
        { field: 'firstName', rule: 'minLength', value: 2 },
        { field: 'lastName', rule: 'maxLength', value: 50 },
        { field: 'age', rule: 'min', value: 18 },
        { field: 'username', rule: 'length', value: '4-20' },
      ],
    });
    setApiEndpoints([]);

    const solutions: BugSolution[] = [
      {
        bugId: 'REG-01', title: 'First name accepts a single character', location: 'RegistrationContext.tsx — validateStep1()',
        technique: 'Boundary Value',
        buggyCode: 'if (firstName.length < 1) { errs.firstName = "First name is required."; }',
        fixedCode: 'if (firstName.trim().length < 2) { errs.firstName = "First name must be at least 2 characters."; }',
        explanation: 'Minimum is 2 chars but the check uses < 1, so one character passes. Compare against 2.',
      },
      {
        bugId: 'REG-02', title: 'Last name has no maximum length limit', location: 'RegistrationContext.tsx — validateStep1()',
        technique: 'Boundary Value',
        buggyCode: 'if (lastName.length < 1) { errs.lastName = "Last name is required."; }\n// no maximum check',
        fixedCode: 'if (lastName.trim().length < 1) { errs.lastName = "Last name is required."; }\nelse if (lastName.length > 50) { errs.lastName = "Max 50 characters."; }',
        explanation: 'No upper bound is enforced, so a 200-char last name is accepted. Reject length > 50.',
      },
      {
        bugId: 'REG-08', title: 'Age accepts zero and negative numbers', location: 'RegistrationContext.tsx — validateStep1()',
        technique: 'Boundary Value',
        buggyCode: 'if (age === "" || Number.isNaN(ageNum)) { errs.age = "Age is required."; }',
        fixedCode: 'if (age === "" || Number.isNaN(ageNum) || ageNum < 18) { errs.age = "Must be 18 or older."; }',
        explanation: 'Only empty/NaN is rejected, so 0 and -5 pass. Enforce ageNum >= 18.',
      },
      {
        bugId: 'REG-11', title: 'Required fields accept whitespace-only input', location: 'RegistrationContext.tsx — validateStep1()',
        technique: 'Missing Validation',
        buggyCode: 'if (firstName.length < 1) { ... }\nif (lastName.length < 1) { ... }',
        fixedCode: 'if (firstName.trim().length < 2) { ... }\nif (lastName.trim().length < 1) { ... }',
        explanation: 'Length checks without .trim() let "   " pass as a value. Trim before measuring.',
      },
      {
        bugId: 'REG-13', title: 'Username has no maximum length', location: 'RegistrationContext.tsx — validateStep1()',
        technique: 'Boundary Value',
        buggyCode: 'if (username.length < 4) { errs.username = "...at least 4 characters."; }',
        fixedCode: 'if (username.length < 4 || username.length > 20) { errs.username = "Username must be 4-20 chars."; }',
        explanation: 'Only a minimum is checked, so a 40-char username passes. Enforce the 20-char maximum.',
      },
      {
        bugId: 'REG-15', title: 'Labels are not associated with their inputs', location: 'StepPersonal.tsx — form fields',
        technique: 'Accessibility',
        buggyCode: '<label className="input-label">First Name *</label>\n<input className="input-field" value={firstName} ... />',
        fixedCode: '<label className="input-label" htmlFor="firstName">First Name *</label>\n<input id="firstName" className="input-field" value={firstName} ... />',
        explanation: 'Without htmlFor/id pairs, clicking a label doesn\'t focus its input and screen readers can\'t announce field names.',
      },
      {
        bugId: 'REG-16', title: 'Validation errors are not announced to screen readers', location: 'StepPersonal.tsx — error spans',
        technique: 'Accessibility',
        buggyCode: '{errors.firstName && <span style={{ color: "var(--danger)" }}>{errors.firstName}</span>}',
        fixedCode: '{errors.firstName && <span role="alert" style={{ color: "var(--danger)" }}>{errors.firstName}</span>}',
        explanation: 'Error text appears visually but has no role="alert"/aria-live, so assistive tech users get no notification that validation failed.',
      },
      {
        bugId: 'REG-17', title: 'Inputs have no autocomplete attributes', location: 'StepPersonal.tsx — name fields',
        technique: 'UX / Accessibility',
        buggyCode: '<input type="text" value={firstName} ... /> // no autocomplete',
        fixedCode: '<input type="text" autoComplete="given-name" value={firstName} ... />\n<input type="text" autoComplete="family-name" value={lastName} ... />',
        explanation: 'Without autocomplete tokens, browsers and password managers can\'t autofill name fields — slower for everyone, and a WCAG 1.3.5 (Identify Input Purpose) failure.',
      },
      {
        bugId: 'REG-18', title: 'Pressing Enter does not advance the wizard', location: 'StepPersonal.tsx — no <form> element',
        technique: 'UX / Missing Functionality',
        buggyCode: '<div className="glass-panel">\n  {/* bare inputs, no <form onSubmit={...}> wrapper */}\n</div>',
        fixedCode: '<form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>\n  ...\n  <button type="submit">Next</button>\n</form>',
        explanation: 'The inputs are not wrapped in a form, so Enter does nothing — users must reach for the mouse to advance.',
      },
      {
        bugId: 'REG-19', title: 'Refreshing the page silently wipes all wizard data', location: 'RegistrationContext.tsx — state only',
        technique: 'Stale State / Persistence',
        buggyCode: 'const [firstName, setFirstName] = useState(""); // no persistence anywhere',
        fixedCode: '// Persist draft to sessionStorage on change and rehydrate on mount:\nconst [firstName, setFirstName] = useState(() => draft.firstName ?? "");',
        explanation: 'Every field lives only in React state. An accidental refresh mid-wizard discards everything with no warning and no recovery.',
      },
      {
        bugId: 'REG-20', title: 'Progress indicator is purely visual (no aria-current)', location: 'WizardChrome.tsx — progress bar',
        technique: 'Accessibility',
        buggyCode: '<div style={{ height: "4px", background: progressStep >= s.n ? ... }} />',
        fixedCode: '<ol aria-label="Registration progress">\n  <li aria-current={step === s.n ? "step" : undefined}>{s.label}</li>\n</ol>',
        explanation: 'Which step is active is conveyed only by bar color and font weight — a screen reader hears three unlabeled icons.',
      },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const inputStyle = (field: string) => ({
    border: errors[field] ? '1px solid var(--danger)' : '1px solid var(--glass-border)',
  });

  const handleNext = () => {
    if (validateStep1()) {
      setProgressStep(2);
      navigate('/registration/account');
    }
  };

  return (
    <WizardChrome>
      {/* BUG REG-18: bare inputs — no <form>, Enter does nothing */}
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Personal Information</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            {/* BUG REG-15: no htmlFor/id association */}
            <label className="input-label">First Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            {/* BUG REG-01 / REG-11 */}
            <input className="input-field" style={inputStyle('firstName')} type="text" value={firstName}
              onChange={e => setFirstName(e.target.value)} placeholder="Min. 2 characters" />
            {/* BUG REG-16: no role="alert" */}
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          Next <ChevronRight size={18} />
        </button>
      </div>
    </WizardChrome>
  );
};
