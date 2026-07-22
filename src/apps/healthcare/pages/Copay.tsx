import { useEffect, useState } from 'react';
import { FileText, Activity } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { HealthChrome } from './HealthChrome';

export const Copay = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();

  const [age, setAge] = useState('');
  const [insuranceType, setInsuranceType] = useState('private');
  const [hasCondition, setHasCondition] = useState(false);
  const [isPediatricEnrolled, setIsPediatricEnrolled] = useState(false);
  const [discount, setDiscount] = useState('');
  const [copay, setCopay] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState('');

  const calculateCopay = () => {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum)) {
      setCopay(null);
      setEligibility('Please enter a valid age.');
      return;
    }

    // BUG HLT-10 (Boundary): Medicare eligibility should be age >= 65, but uses
    // > 65 so a patient who is exactly 65 is wrongly marked ineligible.
    const medicareEligible = ageNum > 65;
    setEligibility(medicareEligible ? 'Eligible for Medicare.' : 'Not eligible for Medicare.');

    // BUG HLT-15 (Decorative Control): insuranceType is captured but never read
    // in this calculation — the selector has zero effect on the result.

    // BUG HLT-08 (Decision Table): pediatric branch is checked AFTER a broad
    // ageNum < 18 branch that already returns, so the pediatric-enrolled branch
    // is unreachable for any minor.
    let base: number;
    if (ageNum < 18) {
      base = 0;
      // eslint-disable-next-line no-dupe-else-if -- intentional bug HLT-08
    } else if (ageNum < 18 && isPediatricEnrolled) {
      // Unreachable: the previous branch already captured every ageNum < 18.
      base = 5;
    } else if (ageNum >= 65 || hasCondition) {
      // BUG HLT-01 (Decision Table): should be (ageNum >= 65 && hasCondition).
      // Using || makes the "senior with condition" $20 branch below unreachable.
      base = 30;
    // eslint-disable-next-line no-dupe-else-if
    } else if (ageNum >= 65 && hasCondition) {
      base = 20;
    } else {
      base = 50;
    }

    const disc = parseFloat(discount);
    // BUG HLT-14 (Logic): no Math.max(0, ...) clamp — copay goes negative when
    // the discount exceeds the base copay.
    const finalCopay = base - (isNaN(disc) ? 0 : disc);
    setCopay(finalCopay);
  };

  useEffect(() => {
    setRequirements(`## MediPortal — Copay & Insurance Estimator
URL: \`/healthcare/copay\`

### Functional Requirements (decision table)
- Under 18 → **$0**; under 18 **and pediatric-enrolled** → **$5**.
- Senior (**age >= 65**) **AND** pre-existing condition → **$20**.
- Senior **or** condition (but not both) → **$30**. Default adult → **$50**.
- A discount may reduce the copay but it can **never go below $0**.
- **Medicare eligibility** applies at **age 65 or older** (>= 65).
- The **Insurance Type** selection must affect the estimate (each plan has different rules).

### Bug Hints (5 bugs on this page):
- 🐛 **Level 8 (Decision Table):** Enter age 70 **with** a pre-existing condition. Per the table you should pay $20. What do you get?
- 🐛 **Level 8 (Decision Table):** Enter age 10 and tick "pediatric program". Expected $5 — what appears?
- 🐛 **Level 8 (Boundary):** Enter age **exactly 65**. Eligible for Medicare?
- 🐛 **Level 8 (Logic):** Base copay $30, discount $60. What's the final number? Can a copay be negative?
- 🐛 **Level 4:** Change Insurance Type between Private/Medicare/Pediatric with everything else equal. Does the result ever change?`);

    setDbTables({
      Copay_Rules: [
        { id: 1, label: 'Minor (<18)', copay: 0 },
        { id: 2, label: 'Pediatric enrolled (<18)', copay: 5 },
        { id: 3, label: 'Senior (>=65) AND pre-existing', copay: 20 },
        { id: 4, label: 'Senior OR pre-existing', copay: 30 },
        { id: 5, label: 'Default adult', copay: 50 },
      ],
    });

    setApiEndpoints([
      {
        method: 'POST',
        path: '/api/copay',
        description: 'Computes a copay. (Reflects HLT-01: OR instead of AND, and HLT-14: negative copay.)',
        payloadTemplate: '{\n  "age": 40,\n  "hasCondition": true,\n  "discount": 60\n}',
        handler: (requestBody: string) => {
          try {
            const { age: a, hasCondition: hc, discount: disc } = JSON.parse(requestBody || '{}');
            const ageNum = Number(a);
            let base: number;
            if (ageNum < 18) base = 0;
            // BUG HLT-01: should be (ageNum >= 65 && hc).
            else if (ageNum >= 65 || hc) base = 30;
            else base = 50;
            // BUG HLT-14: no Math.max(0, ...) clamp.
            const finalCopay = base - (Number(disc) || 0);
            return { status: 200, body: { copay: finalCopay } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ]);

    setRemoteSolutions({ app: 'healthcare', bugIds: ['HLT-01', 'HLT-08', 'HLT-10', 'HLT-14', 'HLT-15'] });
  }, [setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <HealthChrome>
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '520px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} /> Copay &amp; Insurance Estimator
        </h2>

        <div className="input-group">
          <label className="input-label">Patient Age</label>
          <input type="number" className="input-field" placeholder="e.g. 65" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>

        <div className="input-group" style={{ marginTop: '1rem' }}>
          <label className="input-label">Insurance Type</label>
          {/* BUG HLT-15: decorative — value is never used */}
          <select className="input-field" value={insuranceType} onChange={(e) => setInsuranceType(e.target.value)}>
            <option value="private">Private</option>
            <option value="medicare">Medicare</option>
            <option value="pediatric">Pediatric</option>
          </select>
        </div>

        <div className="input-group" style={{ marginTop: '1rem' }}>
          <label className="input-label">Discount ($)</label>
          <input type="number" className="input-field" placeholder="e.g. 10" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>

        <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <input type="checkbox" id="condition" style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            checked={hasCondition} onChange={(e) => setHasCondition(e.target.checked)} />
          <label htmlFor="condition" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>
            Has pre-existing condition
          </label>
        </div>

        <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
          <input type="checkbox" id="pediatric" style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            checked={isPediatricEnrolled} onChange={(e) => setIsPediatricEnrolled(e.target.checked)} />
          <label htmlFor="pediatric" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>
            Enrolled in pediatric program
          </label>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={calculateCopay}>
          <Activity size={18} /> Calculate Copay
        </button>

        {copay !== null && (
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Estimated Copay</div>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary)' }}>${copay}</div>
            {eligibility && <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{eligibility}</div>}
          </div>
        )}
      </div>
    </HealthChrome>
  );
};
