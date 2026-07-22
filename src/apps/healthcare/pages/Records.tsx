import { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { PATIENTS } from '../context/HealthContext';
import { HealthChrome } from './HealthChrome';

// BUG HLT-05 (Edge Case): age computed by naive year subtraction — anyone whose
// birthday hasn't happened yet this year is over-counted by one.
const computeAge = (dob: string) => new Date().getFullYear() - new Date(dob).getFullYear();

export const Records = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();

  useEffect(() => {
    setRequirements(`## MediPortal — Patient Records
URL: \`/healthcare\`

### Functional Requirements
- This is a **patient** portal — the logged-in patient (Jordan Lee) must see **only their own** record, never other patients' data.
- **Age** must be computed correctly from DOB, including on/around the birthday (no off-by-one).
- **DOB** must be displayed in a human-readable, unambiguous format.
- Allergy status must always be explicit: **"none recorded"** is different from an **empty/unknown** value and must be visually distinct.

### Bug Hints (4 bugs on this page):
- 🐛 **Level 9 (Privacy):** You are logged in as Jordan Lee. Whose records can you read on this screen?
- 🐛 **Level 8 (Edge Case):** Compare each row's **Age** against the \`Patients\` table in the DB viewer (the stored ages are correct). Which patient's age is wrong, and why might their **birthday date** matter?
- 🐛 **Level 2 (Content):** How are the DOB values formatted?
- 🐛 **Level 7 (Data Quality):** Look at Alex Kim's Allergies cell. Does it say "none", or is it just… blank? What's the clinical difference?`);

    setDbTables({
      Patients: PATIENTS.map(p => ({ id: p.id, name: p.name, dob: p.dob, stored_age_correct: p.age, insurance: p.insurance, allergies: p.allergies === '' ? '(empty string)' : p.allergies })),
      Session: [{ logged_in_as: 'Jordan Lee (patient id 1)', role: 'patient' }],
    });
    setApiEndpoints([]);

    setRemoteSolutions({ app: 'healthcare', bugIds: ['HLT-05', 'HLT-21', 'HLT-22', 'HLT-23'] });
  }, [setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <HealthChrome>
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '720px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} /> Patient Records
        </h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>DOB</th>
              <th style={{ padding: '0.5rem' }}>Age</th>
              <th style={{ padding: '0.5rem' }}>Insurance</th>
              <th style={{ padding: '0.5rem' }}>Allergies</th>
            </tr>
          </thead>
          <tbody>
            {/* BUG HLT-21: every patient's record renders for a patient-role session */}
            {PATIENTS.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '0.5rem', fontWeight: 500 }}>{p.name}</td>
                {/* BUG HLT-22: raw ISO date */}
                <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{p.dob}</td>
                {/* BUG HLT-05: naive year subtraction */}
                <td style={{ padding: '0.5rem' }}>{computeAge(p.dob)}</td>
                <td style={{ padding: '0.5rem' }}>{p.insurance}</td>
                {/* BUG HLT-23: "" renders blank, indistinguishable from "none" */}
                <td style={{ padding: '0.5rem' }}>{p.allergies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HealthChrome>
  );
};
