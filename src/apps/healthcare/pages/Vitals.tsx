import { useEffect, useState } from 'react';
import { Pill } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { MAX_DOSAGE_MG } from '../context/HealthContext';
import { HealthChrome } from './HealthChrome';

export const Vitals = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();

  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [dosage, setDosage] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [allergies, setAllergies] = useState('');
  const [rxStatus, setRxStatus] = useState('');

  const calculateBmi = () => {
    const w = parseFloat(weight);
    const h = parseFloat(heightCm);
    if (isNaN(w) || isNaN(h) || h <= 0) {
      setBmi(null);
      return;
    }
    // BUG HLT-18 (Boundary): height only rejects <= 0 — 3 cm or 900 cm pass.
    // BUG HLT-19 (Boundary): negative weight is never rejected → negative BMI.
    // BUG HLT-04 (Logic): weight entered in pounds is used directly as kilograms
    // (missing the 0.453592 lb→kg conversion), inflating BMI.
    const meters = h / 100;
    setBmi(Math.round((w / (meters * meters)) * 10) / 10);
    // BUG HLT-20: nothing clears this result when weight/height change afterwards.
  };

  const handlePrescribe = () => {
    const dose = parseFloat(dosage);
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);

    if (isNaN(dose)) {
      setRxStatus('Error: Enter a dosage.');
      return;
    }

    // BUG HLT-06 (Boundary): only a lower bound is checked; there is no upper
    // bound so an overdose (e.g. 5000mg) is accepted. (Intended: dose <= MAX_DOSAGE_MG.)
    if (dose <= 0) {
      setRxStatus('Error: Dosage must be positive.');
      return;
    }

    // BUG HLT-13 (Boundary): blood pressure accepts physically impossible values
    // — only NaN is rejected, with no plausible range (e.g. 40-300 systolic).
    if (isNaN(sys) || isNaN(dia)) {
      setRxStatus('Error: Enter blood pressure.');
      return;
    }

    // BUG HLT-12 (Missing Validation): allergies are not required before
    // prescribing, so a script is issued without confirming allergy history.
    void allergies;

    setRxStatus(`Prescription issued: ${dose}mg. BP recorded ${sys}/${dia}.`);
  };

  useEffect(() => {
    setRequirements(`## MediPortal — Vitals & Prescriptions
URL: \`/healthcare/vitals\`

### Functional Requirements
- **BMI** = weight(kg) / height(m)². Weight entered in **pounds must be converted** to kg first.
- Weight must be **positive**; height must be within a **plausible human range** (e.g. 50–250 cm).
- A displayed BMI must always correspond to the **currently entered** weight/height.
- **Dosage** must be within **1 and ${MAX_DOSAGE_MG} mg** (both bounds enforced).
- **Blood pressure** must be physiologically plausible (systolic 40–300, diastolic 20–200, diastolic < systolic).
- **Allergies** must be confirmed/required before a prescription is issued.

### Bug Hints (7 bugs on this page):
- 🐛 **Level 8 (Logic):** Enter weight **150** (the field says lb) and height 175. A healthy adult should be ~22 BMI. What do you get, and why?
- 🐛 **Level 8 (Boundary):** Prescribe **5000 mg** (max is ${MAX_DOSAGE_MG}). Accepted?
- 🐛 **Level 9 (Boundary):** Enter blood pressure **9000/0**. Any complaint?
- 🐛 **Level 8 (Missing Validation):** Leave Allergies **empty** and issue a prescription. Should that be possible?
- 🐛 **Level 4 (Boundary):** Enter height **3** cm or **900** cm. Plausible? Accepted?
- 🐛 **Level 4 (Boundary):** Enter a **negative weight**. What BMI comes out?
- 🐛 **Level 5 (Stale State):** Calculate a BMI, then change the weight. Does the displayed BMI still match the inputs on screen?`);

    setDbTables({
      Dosage_Rules: [{ min_mg: 1, max_mg: MAX_DOSAGE_MG }],
      BP_Plausible_Ranges: [{ systolic: '40-300', diastolic: '20-200', invariant: 'diastolic < systolic' }],
      BMI_Reference: [
        { input: 'weight 150 lb (68 kg), height 175 cm', expected_bmi: 22.2, note: 'lb must be converted ×0.453592' },
      ],
    });

    setApiEndpoints([
      {
        method: 'POST',
        path: '/api/prescriptions',
        description: 'Issues a prescription. (Reflects HLT-06: no dosage upper bound, HLT-12: allergies not required.)',
        payloadTemplate: '{\n  "dosageMg": 5000,\n  "allergies": ""\n}',
        handler: (requestBody: string) => {
          try {
            const { dosageMg, allergies: alg } = JSON.parse(requestBody || '{}');
            const dose = Number(dosageMg);
            // BUG HLT-06: only a lower bound is checked. BUG HLT-12: allergies optional.
            if (dose <= 0) return { status: 400, body: { error: 'Dosage must be positive' } };
            return { status: 200, body: { issued: true, dosageMg: dose, allergies: alg ?? '' } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ]);

    setRemoteSolutions({ app: 'healthcare', bugIds: ['HLT-04', 'HLT-06', 'HLT-12', 'HLT-13', 'HLT-18', 'HLT-19', 'HLT-20'] });
  }, [setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <HealthChrome>
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '720px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Pill size={20} /> Prescription &amp; Vitals
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Weight (lb)</label>
            {/* BUG HLT-19 (negative passes) / HLT-20 (bmi not invalidated) */}
            <input type="number" className="input-field" placeholder="e.g. 150" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Height (cm)</label>
            {/* BUG HLT-18: only <= 0 rejected */}
            <input type="number" className="input-field" placeholder="e.g. 175" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="input-group" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" style={{ marginTop: 'auto' }} onClick={calculateBmi}>Calculate BMI</button>
          </div>
        </div>

        {bmi !== null && (
          <div style={{ marginTop: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>BMI: {bmi}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Dosage (mg)</label>
            <input type="number" className="input-field" placeholder="e.g. 500" value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Systolic BP</label>
            <input type="number" className="input-field" placeholder="e.g. 120" value={systolic} onChange={(e) => setSystolic(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Diastolic BP</label>
            <input type="number" className="input-field" placeholder="e.g. 80" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} />
          </div>
        </div>

        <div className="input-group" style={{ marginTop: '1rem' }}>
          <label className="input-label">Known Allergies</label>
          <input type="text" className="input-field" placeholder="e.g. penicillin (or 'none')" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={handlePrescribe}>
          <Pill size={18} /> Issue Prescription
        </button>

        {rxStatus && (
          <div style={{
            marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-md)',
            background: rxStatus.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: rxStatus.includes('Error') ? 'var(--danger)' : 'var(--success)',
            textAlign: 'center', fontWeight: 500,
          }}>
            {rxStatus}
          </div>
        )}
      </div>
    </HealthChrome>
  );
};
