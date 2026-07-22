import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../../../qa/QAContext';
import { useRegistration, USERS_TABLE } from '../context/RegistrationContext';
import { WizardChrome } from './WizardChrome';

export const StepPersonal = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
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

    setRemoteSolutions({ app: 'registration', bugIds: ['REG-01', 'REG-02', 'REG-08', 'REG-11', 'REG-13', 'REG-15', 'REG-16', 'REG-17', 'REG-18', 'REG-19', 'REG-20'] });
  }, [setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

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
