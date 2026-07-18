import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, FileText, Activity, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

interface BookedSlot {
  date: string;
  time: string;
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
const MAX_DOSAGE_MG = 1000;

const HealthcareInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  // ── Copay / insurance calculator ──────────────────────────────────────────
  const [age, setAge] = useState('');
  const [insuranceType, setInsuranceType] = useState('private');
  const [hasCondition, setHasCondition] = useState(false);
  const [isPediatricEnrolled, setIsPediatricEnrolled] = useState(false);
  const [discount, setDiscount] = useState('');
  const [copay, setCopay] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState('');

  // ── Appointment booking ───────────────────────────────────────────────────
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [bookings, setBookings] = useState<BookedSlot[]>([]);
  const [bookingStatus, setBookingStatus] = useState('');

  // ── Prescription / vitals ─────────────────────────────────────────────────
  const [weight, setWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [dosage, setDosage] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [allergies, setAllergies] = useState('');
  const [rxStatus, setRxStatus] = useState('');

  const calculateCopay = () => {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum)) {
      setCopay(null);
      setEligibility('Please enter a valid age.');
      return;
    }

    // BUG HLT-10 (L8 Boundary): Medicare eligibility should be age >= 65, but uses
    // > 65 so a patient who is exactly 65 is wrongly marked ineligible.
    const medicareEligible = ageNum > 65;
    setEligibility(medicareEligible ? 'Eligible for Medicare.' : 'Not eligible for Medicare.');

    // BUG HLT-08 (L8 Decision Table): pediatric branch is checked AFTER a broad
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
      // BUG HLT-01 (L8 Decision Table): should be (ageNum >= 65 && hasCondition).
      // Using || makes the "senior with condition" $20 branch below unreachable.
      base = 30;
    // eslint-disable-next-line no-dupe-else-if
    } else if (ageNum >= 65 && hasCondition) {
      base = 20;
    } else {
      base = 50;
    }

    const disc = parseFloat(discount);
    // BUG HLT-14 (L8 Logic): no Math.max(0, ...) clamp — copay goes negative when
    // the discount exceeds the base copay.
    const finalCopay = base - (isNaN(disc) ? 0 : disc);
    setCopay(finalCopay);
  };

  const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  const handleBooking = () => {
    if (!date) {
      setBookingStatus('Error: Please select a date.');
      return;
    }

    const [yStr, mStr, dStr] = date.split('-');
    const year = parseInt(yStr, 10);

    // BUG HLT-03 (L9 Edge Case): a legacy guard crashes on Feb 29 even in a valid
    // leap year (it should only reject Feb 29 in non-leap years).
    if (mStr === '02' && dStr === '29' && isLeapYear(year)) {
      throw new Error('System Exception: Invalid Date in Legacy Scheduling Module.');
    }

    // BUG HLT-11 (L9 Timezone): parsing "YYYY-MM-DD" via new Date() yields midnight
    // UTC, then toLocaleDateString() in a negative-offset zone shows the prior day.
    const parsed = new Date(date);

    // BUG HLT-09 (L9 Edge Case): the confirmation reformats using the ambiguous
    // M/D/YYYY layout so 03/04 (DD/MM) is read back as April 3 (MM/DD).
    const ambiguous = `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;

    // BUG HLT-02 (L9 Date Validation): no check that the date is today or later,
    // so past dates are accepted.
    // (Intended: if (parsed < startOfToday) reject.)

    // BUG HLT-07 (L9 Logic): no double-booking guard — the same date+time can be
    // booked repeatedly. (Intended: reject if a matching slot already exists.)
    setBookings(prev => [...prev, { date, time: timeSlot }]);
    setBookingStatus(`Appointment booked for ${ambiguous} at ${timeSlot} (${parsed.toLocaleDateString()}).`);
  };

  const calculateBmi = () => {
    const w = parseFloat(weight);
    const h = parseFloat(heightCm);
    if (isNaN(w) || isNaN(h) || h <= 0) {
      setBmi(null);
      return;
    }
    // BUG HLT-04 (L8 Logic): weight entered in pounds is used directly as kilograms
    // (missing the 0.453592 lb→kg conversion), inflating BMI.
    const meters = h / 100;
    setBmi(Math.round((w / (meters * meters)) * 10) / 10);
  };

  const handlePrescribe = () => {
    const dose = parseFloat(dosage);
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);

    if (isNaN(dose)) {
      setRxStatus('Error: Enter a dosage.');
      return;
    }

    // BUG HLT-06 (L8 Boundary): only a lower bound is checked; there is no upper
    // bound so an overdose (e.g. 5000mg) is accepted. (Intended: dose <= MAX_DOSAGE_MG.)
    if (dose <= 0) {
      setRxStatus('Error: Dosage must be positive.');
      return;
    }

    // BUG HLT-13 (L9 Boundary): blood pressure accepts physically impossible values
    // — only NaN is rejected, with no plausible range (e.g. 40-300 systolic).
    if (isNaN(sys) || isNaN(dia)) {
      setRxStatus('Error: Enter blood pressure.');
      return;
    }

    // BUG HLT-12 (L8 Missing Validation): allergies are not required before
    // prescribing, so a script is issued without confirming allergy history.
    void allergies;

    setRxStatus(`Prescription issued: ${dose}mg. BP recorded ${sys}/${dia}.`);
  };

  useEffect(() => {
    setRequirements(`## Healthcare Patient Portal — "MediPortal Connect"

Patients estimate insurance copays, book appointments, and record vitals/prescriptions.

### Functional Requirements
- **Copay rules** (decision table): under 18 → $0 (pediatric-enrolled → $5); senior (**age >= 65**) **AND** pre-existing condition → $20; otherwise senior or condition → $30; default → $50. A discount may reduce the copay but it can **never go below $0**.
- **Medicare eligibility** applies at **age 65 or older** (>= 65).
- **Appointment dates** must be **today or in the future**; past dates are rejected.
- **Feb 29** is a valid date in a **leap year** and must not error.
- A **time slot** can only be booked **once** per date — no double-booking.
- Dates must be parsed and displayed **unambiguously** and must **not drift across timezones**.
- **BMI** = weight(kg) / height(m)². Weight entered in **pounds must be converted** to kg first.
- **Age** must be computed correctly, including the day **on/around the birthday** (no off-by-one).
- **Prescription dosage** must be within **1 and ${MAX_DOSAGE_MG} mg** (both bounds enforced).
- **Blood pressure** must be within physiologically plausible ranges (e.g. systolic 40-300).
- **Allergies** must be confirmed/required before a prescription is issued.

### Levels
14 bugs, difficulty levels 8-9 (decision table, date validation, edge case, boundary, timezone, missing validation, logic).`);

    setDbTables({
      Patients: [
        { id: 1, name: 'Jordan Lee', dob: '1961-06-14', age: 64, insurance: 'medicare', allergies: 'penicillin' },
        { id: 2, name: 'Sam Rivera', dob: '2010-02-29', age: 16, insurance: 'pediatric', allergies: 'none' },
        { id: 3, name: 'Alex Kim', dob: '1990-03-04', age: 36, insurance: 'private', allergies: '' },
      ],
      Appointments: [
        { id: 901, patientId: 1, date: '2026-06-20', time: '09:00', status: 'confirmed' },
        { id: 902, patientId: 3, date: '2026-06-20', time: '09:00', status: 'confirmed' },
      ],
      Copay_Rules: [
        { id: 1, label: 'Minor (<18)', copay: 0 },
        { id: 2, label: 'Pediatric enrolled (<18)', copay: 5 },
        { id: 3, label: 'Senior (>=65) AND pre-existing', copay: 20 },
        { id: 4, label: 'Senior OR pre-existing', copay: 30 },
        { id: 5, label: 'Default adult', copay: 50 },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/appointments',
        description: 'Books an appointment. (Reflects HLT-02: accepts past dates, and HLT-07: allows double-booking.)',
        payloadTemplate: '{\n  "date": "2020-01-01",\n  "time": "09:00"\n}',
        handler: (requestBody: string) => {
          try {
            const { date: d, time } = JSON.parse(requestBody || '{}');
            // BUG HLT-02: no past-date validation. BUG HLT-07: no conflict check.
            return { status: 200, body: { booked: true, date: d, time } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
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
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      {
        bugId: 'HLT-01', title: 'Copay uses OR instead of AND', location: 'HealthcareApp.tsx — calculateCopay()',
        technique: 'Decision Table',
        buggyCode: 'else if (ageNum >= 65 || hasCondition) { base = 30; }',
        fixedCode: 'else if (ageNum >= 65 && hasCondition) { base = 20; }\nelse if (ageNum >= 65 || hasCondition) { base = 30; }',
        explanation: 'The OR makes the "senior AND condition = $20" branch unreachable. Check the AND case first.',
      },
      {
        bugId: 'HLT-02', title: 'Booking accepts past dates', location: 'HealthcareApp.tsx — handleBooking()',
        technique: 'Date Validation',
        buggyCode: '// no past-date check\nsetBookings(prev => [...prev, { date, time: timeSlot }]);',
        fixedCode: 'const today = new Date(); today.setHours(0,0,0,0);\nif (parsed < today) { setBookingStatus("Error: date in the past."); return; }',
        explanation: 'Appointments in the past are accepted. Reject dates earlier than today.',
      },
      {
        bugId: 'HLT-03', title: 'Feb 29 in a leap year throws', location: 'HealthcareApp.tsx — handleBooking()',
        technique: 'Edge Case',
        buggyCode: "if (mStr === '02' && dStr === '29' && isLeapYear(year)) { throw ... }",
        fixedCode: "if (mStr === '02' && dStr === '29' && !isLeapYear(year)) { /* reject only non-leap */ }",
        explanation: 'Feb 29 is valid in a leap year; the guard rejects the valid case. Invert to !isLeapYear.',
      },
      {
        bugId: 'HLT-04', title: 'BMI treats pounds as kilograms', location: 'HealthcareApp.tsx — calculateBmi()',
        technique: 'Logic Error',
        buggyCode: 'setBmi(w / (meters * meters)); // w is in lb',
        fixedCode: 'const kg = w * 0.453592;\nsetBmi(kg / (meters * meters));',
        explanation: 'Pounds are used directly as kg, inflating BMI. Convert lb→kg (×0.453592) first.',
      },
      {
        bugId: 'HLT-05', title: 'Age off-by-one near birthday', location: 'HealthcareApp.tsx — age from dob',
        technique: 'Edge Case',
        buggyCode: 'const age = today.getFullYear() - dob.getFullYear();',
        fixedCode: 'let age = today.getFullYear() - dob.getFullYear();\nconst m = today.getMonth() - dob.getMonth();\nif (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;',
        explanation: 'Year subtraction alone over-counts before the birthday. Subtract one if the birthday has not occurred yet.',
      },
      {
        bugId: 'HLT-06', title: 'Dosage has no upper bound', location: 'HealthcareApp.tsx — handlePrescribe()',
        technique: 'Boundary Value',
        buggyCode: 'if (dose <= 0) { ...reject }',
        fixedCode: `if (dose <= 0 || dose > ${MAX_DOSAGE_MG}) { setRxStatus("Error: dosage out of range."); return; }`,
        explanation: 'Only the lower bound is enforced, allowing overdoses. Also reject dose above the max.',
      },
      {
        bugId: 'HLT-07', title: 'Double-booking allowed', location: 'HealthcareApp.tsx — handleBooking()',
        technique: 'Logic Error',
        buggyCode: 'setBookings(prev => [...prev, { date, time: timeSlot }]);',
        fixedCode: 'if (bookings.some(b => b.date === date && b.time === timeSlot)) {\n  setBookingStatus("Error: slot already booked."); return;\n}',
        explanation: 'The same date+time can be booked repeatedly. Guard against an existing matching slot.',
      },
      {
        bugId: 'HLT-08', title: 'Pediatric branch unreachable', location: 'HealthcareApp.tsx — calculateCopay()',
        technique: 'Decision Table',
        buggyCode: 'if (ageNum < 18) { base = 0; }\nelse if (ageNum < 18 && isPediatricEnrolled) { base = 5; }',
        fixedCode: 'if (ageNum < 18) { base = isPediatricEnrolled ? 5 : 0; }',
        explanation: 'The first branch swallows all minors, so the pediatric branch never runs. Fold the flag into the minor branch.',
      },
      {
        bugId: 'HLT-09', title: 'Ambiguous DD/MM vs MM/DD parsing', location: 'HealthcareApp.tsx — handleBooking()',
        technique: 'Edge Case',
        buggyCode: 'const ambiguous = `${parsed.getMonth()+1}/${parsed.getDate()}/${parsed.getFullYear()}`;',
        fixedCode: 'const iso = date; // keep unambiguous ISO YYYY-MM-DD for display',
        explanation: 'Reformatting to M/D/YYYY makes 03/04 ambiguous. Display the ISO date to avoid locale confusion.',
      },
      {
        bugId: 'HLT-10', title: 'Eligibility wrong at age 65', location: 'HealthcareApp.tsx — calculateCopay()',
        technique: 'Boundary Value',
        buggyCode: 'const medicareEligible = ageNum > 65;',
        fixedCode: 'const medicareEligible = ageNum >= 65;',
        explanation: 'Medicare starts at 65 (inclusive). Using > 65 excludes patients who are exactly 65.',
      },
      {
        bugId: 'HLT-11', title: 'Timezone shifts to previous day', location: 'HealthcareApp.tsx — handleBooking()',
        technique: 'Timezone Error',
        buggyCode: 'const parsed = new Date(date); // midnight UTC\nparsed.toLocaleDateString();',
        fixedCode: "const [y,m,d] = date.split('-').map(Number);\nconst parsed = new Date(y, m - 1, d); // local midnight",
        explanation: 'new Date("YYYY-MM-DD") is UTC midnight; in negative offsets it renders the prior day. Build a local date.',
      },
      {
        bugId: 'HLT-12', title: 'Allergies not required to prescribe', location: 'HealthcareApp.tsx — handlePrescribe()',
        technique: 'Missing Validation',
        buggyCode: 'void allergies; // not validated',
        fixedCode: 'if (allergies.trim() === "") { setRxStatus("Error: confirm allergies first."); return; }',
        explanation: 'A prescription is issued without confirming allergy history. Require the allergy field.',
      },
      {
        bugId: 'HLT-13', title: 'BP allows impossible values', location: 'HealthcareApp.tsx — handlePrescribe()',
        technique: 'Boundary Value',
        buggyCode: 'if (isNaN(sys) || isNaN(dia)) { ...reject }',
        fixedCode: 'if (sys < 40 || sys > 300 || dia < 20 || dia > 200 || dia >= sys) {\n  setRxStatus("Error: implausible BP."); return;\n}',
        explanation: 'Only NaN is rejected, so values like 9000/0 pass. Enforce physiologically plausible ranges.',
      },
      {
        bugId: 'HLT-14', title: 'Copay can go negative', location: 'HealthcareApp.tsx — calculateCopay()',
        technique: 'Logic Error',
        buggyCode: 'const finalCopay = base - disc;',
        fixedCode: 'const finalCopay = Math.max(0, base - disc);',
        explanation: 'A discount larger than the copay yields a negative copay. Clamp the result at 0.',
      },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button
        className="btn btn-secondary"
        onClick={() => navigate('/')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>MediPortal Connect</h1>
        <p>Patient portal: appointments, insurance, and vitals. (Difficulty: Expert)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Copay / insurance calculator */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} /> Copay &amp; Insurance Estimator
          </h2>

          <div className="input-group">
            <label className="input-label">Patient Age</label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 65"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">Insurance Type</label>
            <select
              className="input-field"
              value={insuranceType}
              onChange={(e) => setInsuranceType(e.target.value)}
            >
              <option value="private">Private</option>
              <option value="medicare">Medicare</option>
              <option value="pediatric">Pediatric</option>
            </select>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">Discount ($)</label>
            <input
              type="number"
              className="input-field"
              placeholder="e.g. 10"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <input
              type="checkbox"
              id="condition"
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              checked={hasCondition}
              onChange={(e) => setHasCondition(e.target.checked)}
            />
            <label htmlFor="condition" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>
              Has pre-existing condition
            </label>
          </div>

          <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
            <input
              type="checkbox"
              id="pediatric"
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              checked={isPediatricEnrolled}
              onChange={(e) => setIsPediatricEnrolled(e.target.checked)}
            />
            <label htmlFor="pediatric" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>
              Enrolled in pediatric program
            </label>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={calculateCopay}
          >
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

        {/* Appointment booking */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} /> Schedule Appointment
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Clinics are open Monday-Friday. Future dates only.
          </p>

          <div className="input-group">
            <label className="input-label">Select Date</label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">Time Slot</label>
            <select
              className="input-field"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
            >
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={handleBooking}
          >
            Confirm Booking
          </button>

          {bookings.length > 0 && (
            <div style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
              <strong>Booked slots:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                {bookings.map((b, i) => <li key={i}>{b.date} @ {b.time}</li>)}
              </ul>
            </div>
          )}

          {bookingStatus && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: bookingStatus.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: bookingStatus.includes('Error') ? 'var(--danger)' : 'var(--success)',
              textAlign: 'center',
              fontWeight: 500,
            }}>
              {bookingStatus}
            </div>
          )}
        </div>

        {/* Prescription / vitals */}
        <div className="glass-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill size={20} /> Prescription &amp; Vitals
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Weight (lb)</label>
              <input type="number" className="input-field" placeholder="e.g. 150" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Height (cm)</label>
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

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={handlePrescribe}
          >
            <Pill size={18} /> Issue Prescription
          </button>

          {rxStatus && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: rxStatus.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: rxStatus.includes('Error') ? 'var(--danger)' : 'var(--success)',
              textAlign: 'center',
              fontWeight: 500,
            }}>
              {rxStatus}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export const HealthcareApp = () => (
  <QALayout>
    <HealthcareInner />
  </QALayout>
);
