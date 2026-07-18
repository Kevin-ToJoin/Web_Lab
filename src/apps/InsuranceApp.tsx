import { useState, useEffect } from 'react';
import { ArrowLeft, Car, Calculator, ShieldCheck, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

interface CoverageTier {
  id: string;
  name: string;
  base: number;
}

const COVERAGE_TIERS: CoverageTier[] = [
  { id: 'basic',    name: 'Basic',    base: 400 },
  { id: 'standard', name: 'Standard', base: 700 },
  { id: 'premium',  name: 'Premium',  base: 1100 },
];

const REGION_MULTIPLIERS: Record<string, number> = {
  urban:    1.4,
  suburban: 1.1,
  rural:    0.9,
};

const MAX_VEHICLE_VALUE = 250000;

interface Breakdown {
  baseRate: number;
  regionMultiplier: number;
  youngDriverSurcharge: number;
  highRiskSurcharge: number;
  deductibleAdjust: number;
  discounts: number;
  finalPremium: number;
  notes: string[];
}

const InsuranceInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [age, setAge] = useState('30');
  const [region, setRegion] = useState('urban');
  const [highRisk, setHighRisk] = useState(false);
  const [smoker, setSmoker] = useState(false);
  const [coverageId, setCoverageId] = useState('standard');
  const [vehicleValue, setVehicleValue] = useState('20000');
  const [deductible, setDeductible] = useState('500');
  const [loyaltyYears, setLoyaltyYears] = useState('0');
  const [multiPolicy, setMultiPolicy] = useState(false);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [status, setStatus] = useState('');

  const calculatePremium = () => {
    setStatus('');
    const notes: string[] = [];

    const ageNum = parseInt(age, 10);
    const vehicle = parseFloat(vehicleValue);
    const deduct = parseFloat(deductible);
    const loyalty = parseInt(loyaltyYears, 10) || 0;

    // BUG INS-12 (L7 Missing Validation): negative age / negative vehicle value are
    // accepted — there is no floor check, so age -5 or a -$10,000 vehicle is priced.
    // (Intended: reject ageNum < 16 or vehicle < 0.)
    if (isNaN(ageNum) || isNaN(vehicle)) {
      setStatus('Please enter a valid age and vehicle value.');
      setBreakdown(null);
      return;
    }

    // BUG INS-10 (L7 Edge Case): no maximum-coverage cap — an absurd vehicle value
    // (e.g. $5,000,000) is accepted instead of being rejected/clamped at the cap.
    // (Intended: if (vehicle > MAX_VEHICLE_VALUE) reject.)
    void MAX_VEHICLE_VALUE;

    // ── Base rate by coverage tier ──────────────────────────────────────────
    const tier = COVERAGE_TIERS.find(t => t.id === coverageId);
    let baseRate: number;
    // BUG INS-04 (L8 Boundary): coverage tier off-by-one — Premium is priced one tier
    // down as Standard because the index is shifted by one.
    // BUG INS-14 (L8 Logic): the default fallthrough uses the wrong base (Basic's 400
    // is intended as the safe default, but Premium's 1100 is applied) when no coverage
    // is matched.
    if (coverageId === 'basic') {
      baseRate = COVERAGE_TIERS[0].base;
    } else if (coverageId === 'standard') {
      baseRate = COVERAGE_TIERS[1].base;
    } else if (coverageId === 'premium') {
      // Off-by-one: should be COVERAGE_TIERS[2].base (1100) but uses [1] (700).
      baseRate = COVERAGE_TIERS[1].base;
    } else {
      // Wrong default base: should fall back to Basic (400), applies Premium (1100).
      baseRate = COVERAGE_TIERS[2].base;
    }
    void tier;
    notes.push(`Base rate: $${baseRate.toFixed(2)}`);

    // ── Region multiplier ───────────────────────────────────────────────────
    // BUG INS-03 (L7 Logic): region lookup falls back to the WRONG default (urban 1.4,
    // the most expensive) when the region is not found, instead of a neutral 1.0.
    const regionMultiplier = REGION_MULTIPLIERS[region] ?? REGION_MULTIPLIERS['urban'];
    notes.push(`Region multiplier (${region}): x${regionMultiplier}`);

    let premium = baseRate * regionMultiplier;

    // ── Young-driver surcharge ──────────────────────────────────────────────
    // BUG INS-01 (L7 Boundary): the young-driver surcharge should apply only to drivers
    // strictly UNDER 25 (age < 25), but uses age <= 25, so a 25-year-old is wrongly
    // charged the surcharge (off-by-one).
    let youngDriverSurcharge = 0;
    if (ageNum <= 25) {
      youngDriverSurcharge = 150;
      premium += youngDriverSurcharge;
      notes.push('Young-driver surcharge: +$150');
    }

    // ── High-risk / smoker decision table ───────────────────────────────────
    // BUG INS-02 (L8 Decision Table): the top-tier surcharge uses OR instead of AND,
    // so "high-risk AND smoker" (the most severe branch) is unreachable — either flag
    // alone already triggers the +$300 branch.
    // BUG INS-13 (L9 Decision Table): the smoker+region combination below is a
    // duplicate/dead else-if that can never be reached (the prior branch already
    // captured every smoker).
    let highRiskSurcharge = 0;
    if (highRisk || smoker) {
      // Should be (highRisk && smoker) for this most-severe +$300 tier.
      highRiskSurcharge = 300;
      notes.push('High-risk/smoker surcharge: +$300');
      // eslint-disable-next-line no-dupe-else-if -- intentional bug INS-13
    } else if (smoker && region === 'urban') {
      // Dead branch: every smoker was already captured above.
      highRiskSurcharge = 120;
      notes.push('Urban-smoker surcharge: +$120');
      // eslint-disable-next-line no-dupe-else-if -- intentional bug INS-02/INS-07
    } else if (highRisk) {
      highRiskSurcharge = 200;
      notes.push('High-risk surcharge: +$200');
    }
    premium += highRiskSurcharge;

    // ── Deductible adjustment ───────────────────────────────────────────────
    // BUG INS-09 (L8 Logic): the deductible→premium relationship is INVERTED. A higher
    // deductible should LOWER the premium (customer accepts more risk), but here it
    // ADDS to the premium.
    let deductibleAdjust = 0;
    if (!isNaN(deduct)) {
      deductibleAdjust = deduct * 0.1; // should be subtracted
      premium += deductibleAdjust;
      notes.push(`Deductible adjustment: +$${deductibleAdjust.toFixed(2)}`);
    }

    // ── Senior-safe-driver low-rate branch ──────────────────────────────────
    // BUG INS-07 (L9 Decision Table): the senior-safe-driver discount branch is
    // unreachable because the broad "adult" branch ahead of it already returns for
    // everyone aged 25+, so a 70-year-old with no risk flags never gets the low rate.
    let discounts = 0;
    if (ageNum >= 25) {
      // Broad branch swallows all adults, including seniors.
      discounts += 0;
    } else if (ageNum >= 65 && !highRisk && !smoker) {
      // Unreachable: seniors (>=65) already matched ageNum >= 25 above.
      discounts += 250;
      notes.push('Senior-safe-driver discount: -$250');
    }

    // ── Loyalty discount ────────────────────────────────────────────────────
    // BUG INS-08 (L7 Boundary): loyalty discount should apply at 5+ years (>= 5), but
    // uses > 5, so a 5-year loyal customer misses the discount (off-by-one).
    if (loyalty > 5) {
      const loyaltyDisc = 100;
      discounts += loyaltyDisc;
      notes.push('Loyalty discount: -$100');
    }

    // ── Multi-policy discount ───────────────────────────────────────────────
    // BUG INS-06 (L8 Logic): the multi-policy discount is applied TWICE — it is added
    // to the discount total in two places, doubling a $75 discount to $150.
    if (multiPolicy) {
      const multiDisc = 75;
      discounts += multiDisc;
      discounts += multiDisc; // applied a second time (the bug)
      notes.push('Multi-policy discount: -$150');
    }

    premium -= discounts;

    // BUG INS-05 (L7 Logic): a discount larger than the premium yields a NEGATIVE
    // premium because there is no Math.max(0, ...) clamp.
    // (Intended: finalPremium = Math.max(0, premium).)
    const clamped = premium;

    // BUG INS-11 (L8 Logic): the premium is left as a raw float and is NOT rounded to
    // cents, so amounts drift (e.g. 830.0000000001) instead of a clean 2-decimal value.
    const finalPremium = clamped;

    setBreakdown({
      baseRate,
      regionMultiplier,
      youngDriverSurcharge,
      highRiskSurcharge,
      deductibleAdjust,
      discounts,
      finalPremium,
      notes,
    });
    setStatus(`Premium calculated for a ${ageNum}-year-old ${region} driver.`);
  };

  useEffect(() => {
    setRequirements(`## SecureQuote — Auto-Insurance Premium Calculator

Agents price an auto policy from driver, vehicle, and coverage inputs.

### Rating Decision Table
| Rule | Condition | Effect |
| --- | --- | --- |
| Base rate | coverage = Basic / Standard / Premium | $400 / $700 / $1100 |
| Region | urban / suburban / rural | x1.4 / x1.1 / x0.9 (unknown region → **x1.0**) |
| Young driver | **age < 25** (strictly under) | +$150 |
| High-risk **AND** smoker | both flags set | +$300 |
| High-risk only | high-risk, not smoker | +$200 |
| Deductible | higher deductible | **LOWERS** premium |
| Senior-safe | **age >= 65** AND no risk flags | -$250 |
| Loyalty | **years >= 5** | -$100 |
| Multi-policy | bundled | -$75 (**once**) |

### Rules
- A 25-year-old is **not** a young driver (surcharge is for under-25 only).
- The most-severe surcharge requires high-risk **AND** smoker together.
- An unknown region falls back to a **neutral x1.0** multiplier.
- **Premium** is the tier's base — Premium coverage must price as **$1100**, not Standard.
- The final premium can **never go below $0** (clamp discounts).
- The multi-policy discount is applied **exactly once**.
- Higher deductibles **reduce** the premium (the customer takes on more risk).
- A **5-year** loyal customer **does** qualify for the loyalty discount (>= 5).
- Vehicle value above **$${MAX_VEHICLE_VALUE}** must be rejected (no unlimited coverage).
- Premiums are **rounded to cents** (2 decimals).
- **Negative age / negative vehicle value** must be rejected.

### Levels
14 bugs, difficulty levels 7-9 (boundary value, decision table, logic, edge case, missing validation).`);

    setDbTables({
      RateTable: COVERAGE_TIERS.map((t, i) => ({ id: i + 1, coverage: t.name, baseRate: t.base })),
      RegionMultipliers: Object.entries(REGION_MULTIPLIERS).map(([r, m], i) => ({ id: i + 1, region: r, multiplier: m })),
      Discounts: [
        { id: 1, label: 'Senior-safe driver (>=65, no flags)', amount: 250 },
        { id: 2, label: 'Loyalty (>= 5 years)', amount: 100 },
        { id: 3, label: 'Multi-policy bundle', amount: 75 },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/quote',
        description: 'Prices a policy. (Reflects INS-02: OR instead of AND for high-risk+smoker, and INS-05: premium can go negative.)',
        payloadTemplate: '{\n  "coverage": "standard",\n  "region": "urban",\n  "age": 40,\n  "highRisk": true,\n  "smoker": false,\n  "discount": 2000\n}',
        handler: (requestBody: string) => {
          try {
            const { coverage, region: rg, highRisk: hr, smoker: sm, discount } = JSON.parse(requestBody || '{}');
            const t = COVERAGE_TIERS.find(c => c.id === coverage) ?? COVERAGE_TIERS[1];
            const mult = REGION_MULTIPLIERS[rg] ?? REGION_MULTIPLIERS['urban'];
            let premium = t.base * mult;
            // BUG INS-02: OR instead of AND.
            if (hr || sm) premium += 300;
            // BUG INS-05: no Math.max(0, ...) clamp.
            const finalPremium = premium - (Number(discount) || 0);
            return { status: 200, body: { premium: finalPremium } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/coverage',
        description: 'Returns the base rate for a coverage tier. (Reflects INS-04: Premium priced as Standard, and INS-14: wrong default base.)',
        payloadTemplate: '{\n  "coverage": "premium"\n}',
        handler: (requestBody: string) => {
          try {
            const { coverage } = JSON.parse(requestBody || '{}');
            let base: number;
            if (coverage === 'basic') base = COVERAGE_TIERS[0].base;
            else if (coverage === 'standard') base = COVERAGE_TIERS[1].base;
            // BUG INS-04: Premium off-by-one → Standard's 700.
            else if (coverage === 'premium') base = COVERAGE_TIERS[1].base;
            // BUG INS-14: wrong default base (Premium instead of Basic).
            else base = COVERAGE_TIERS[2].base;
            return { status: 200, body: { coverage, baseRate: base } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      { bugId: 'INS-01', title: 'Young-driver surcharge boundary off-by-one', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Boundary Value',
        buggyCode: 'if (ageNum <= 25) { youngDriverSurcharge = 150; }',
        fixedCode: 'if (ageNum < 25) { youngDriverSurcharge = 150; }',
        explanation: 'The surcharge is for drivers strictly under 25. Using <= 25 wrongly charges a 25-year-old.' },
      { bugId: 'INS-02', title: 'High-risk surcharge uses OR instead of AND', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Decision Table',
        buggyCode: 'if (highRisk || smoker) { highRiskSurcharge = 300; }',
        fixedCode: 'if (highRisk && smoker) { highRiskSurcharge = 300; }\nelse if (highRisk) { highRiskSurcharge = 200; }',
        explanation: 'The OR triggers the top +$300 tier for either flag alone, making the "high-risk AND smoker" and lower branches unreachable.' },
      { bugId: 'INS-03', title: 'Region multiplier wrong default', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Logic Error',
        buggyCode: "const regionMultiplier = REGION_MULTIPLIERS[region] ?? REGION_MULTIPLIERS['urban'];",
        fixedCode: 'const regionMultiplier = REGION_MULTIPLIERS[region] ?? 1.0;',
        explanation: 'An unknown region falls back to the most expensive urban x1.4 instead of a neutral x1.0.' },
      { bugId: 'INS-04', title: 'Premium coverage priced as Standard', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Boundary Value',
        buggyCode: "else if (coverageId === 'premium') { baseRate = COVERAGE_TIERS[1].base; }",
        fixedCode: "else if (coverageId === 'premium') { baseRate = COVERAGE_TIERS[2].base; }",
        explanation: 'The tier index is off by one, so Premium ($1100) is billed at Standard ($700).' },
      { bugId: 'INS-05', title: 'Premium can go negative', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Logic Error',
        buggyCode: 'const clamped = premium;',
        fixedCode: 'const clamped = Math.max(0, premium);',
        explanation: 'A discount larger than the premium yields a negative premium. Clamp the result at 0.' },
      { bugId: 'INS-06', title: 'Multi-policy discount applied twice', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Logic Error',
        buggyCode: 'discounts += multiDisc;\ndiscounts += multiDisc; // twice',
        fixedCode: 'discounts += multiDisc; // once',
        explanation: 'The $75 bundle discount is added twice, doubling to $150. Apply it a single time.' },
      { bugId: 'INS-07', title: 'Senior-safe-driver branch unreachable', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Decision Table',
        buggyCode: 'if (ageNum >= 25) { discounts += 0; }\nelse if (ageNum >= 65 && !highRisk && !smoker) { discounts += 250; }',
        fixedCode: 'if (ageNum >= 65 && !highRisk && !smoker) { discounts += 250; }\nelse if (ageNum >= 25) { /* no discount */ }',
        explanation: 'The broad age >= 25 branch swallows every senior, so the senior-safe discount never runs. Check the specific case first.' },
      { bugId: 'INS-08', title: 'Loyalty discount boundary off-by-one', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Boundary Value',
        buggyCode: 'if (loyalty > 5) { discounts += 100; }',
        fixedCode: 'if (loyalty >= 5) { discounts += 100; }',
        explanation: 'A 5-year loyal customer should qualify. Using > 5 skips exactly 5 years — use >= 5.' },
      { bugId: 'INS-09', title: 'Deductible raises premium (inverted)', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Logic Error',
        buggyCode: 'deductibleAdjust = deduct * 0.1;\npremium += deductibleAdjust;',
        fixedCode: 'deductibleAdjust = deduct * 0.1;\npremium -= deductibleAdjust;',
        explanation: 'A higher deductible means the customer accepts more risk, which should LOWER the premium. The sign is inverted.' },
      { bugId: 'INS-10', title: 'No maximum-coverage cap', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Edge Case',
        buggyCode: 'void MAX_VEHICLE_VALUE; // never checked',
        fixedCode: 'if (vehicle > MAX_VEHICLE_VALUE) { setStatus("Vehicle value exceeds the maximum insurable amount."); return; }',
        explanation: 'An absurd vehicle value is accepted. Reject values above the maximum insurable amount.' },
      { bugId: 'INS-11', title: 'Premium not rounded to cents', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Logic Error',
        buggyCode: 'const finalPremium = clamped;',
        fixedCode: 'const finalPremium = Math.round(clamped * 100) / 100;',
        explanation: 'The raw float drifts (e.g. 830.0000001). Round to two decimal places (cents).' },
      { bugId: 'INS-12', title: 'Negative age / vehicle value accepted', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Missing Validation',
        buggyCode: 'if (isNaN(ageNum) || isNaN(vehicle)) { reject }',
        fixedCode: 'if (isNaN(ageNum) || ageNum < 16 || isNaN(vehicle) || vehicle < 0) { setStatus("Invalid age or vehicle value."); return; }',
        explanation: 'Only NaN is rejected, so a negative age or negative vehicle value is priced. Add floor checks.' },
      { bugId: 'INS-13', title: 'Smoker+region branch is dead code', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Decision Table',
        buggyCode: 'if (highRisk || smoker) { ... }\nelse if (smoker && region === "urban") { ... }',
        fixedCode: 'if (highRisk && smoker) { ... }\nelse if (smoker && region === "urban") { highRiskSurcharge = 120; }',
        explanation: 'The first OR branch captures every smoker, so the urban-smoker else-if can never run. Tighten the first branch to AND.' },
      { bugId: 'INS-14', title: 'Base-rate default fallthrough wrong', location: 'InsuranceApp.tsx — calculatePremium()', technique: 'Logic Error',
        buggyCode: 'else { baseRate = COVERAGE_TIERS[2].base; } // Premium',
        fixedCode: 'else { baseRate = COVERAGE_TIERS[0].base; } // safe default: Basic',
        explanation: 'When no coverage is selected the default applies Premium ($1100) instead of the safe Basic ($400).' },
    ];
    setSolutions(solutions);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const inputStyle = { marginBottom: '1rem' };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>SecureQuote</h1>
        <p>Auto-insurance premium calculator: rate a policy from driver, vehicle, and coverage. (Difficulty: Expert)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Quote form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={20} /> Policy Details
          </h2>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="age">Driver Age</label>
              <input id="age" type="number" className="input-field" value={age} onChange={e => setAge(e.target.value)} />
            </div>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="region">Region</label>
              <select id="region" className="input-field" value={region} onChange={e => setRegion(e.target.value)}>
                <option value="urban">Urban</option>
                <option value="suburban">Suburban</option>
                <option value="rural">Rural</option>
              </select>
            </div>
          </div>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="coverage">Coverage Level</label>
            <select id="coverage" className="input-field" value={coverageId} onChange={e => setCoverageId(e.target.value)}>
              {COVERAGE_TIERS.map(t => (
                <option key={t.id} value={t.id}>{t.name} — ${t.base} base</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="vehicle-value">Vehicle Value ($)</label>
              <input id="vehicle-value" type="number" className="input-field" value={vehicleValue} onChange={e => setVehicleValue(e.target.value)} />
            </div>
            <div className="input-group" style={{ ...inputStyle, flex: 1 }}>
              <label className="input-label" htmlFor="deductible">Deductible ($)</label>
              <input id="deductible" type="number" className="input-field" value={deductible} onChange={e => setDeductible(e.target.value)} />
            </div>
          </div>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="loyalty-years">Loyalty Years</label>
            <input id="loyalty-years" type="number" className="input-field" value={loyaltyYears} onChange={e => setLoyaltyYears(e.target.value)} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={highRisk} onChange={e => setHighRisk(e.target.checked)} />
            High-risk driver
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={smoker} onChange={e => setSmoker(e.target.checked)} />
            Smoker
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={multiPolicy} onChange={e => setMultiPolicy(e.target.checked)} />
            <Percent size={16} /> Multi-policy bundle discount
          </label>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={calculatePremium}>
            <Calculator size={18} /> Calculate Premium
          </button>

          {status && <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{status}</p>}
        </div>

        {/* Premium breakdown */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} /> Premium Breakdown
          </h2>

          {!breakdown && <p style={{ color: 'var(--text-muted)' }}>Enter policy details and calculate a premium.</p>}

          {breakdown && (
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Base rate</span><span>${breakdown.baseRate.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Region multiplier</span><span>x{breakdown.regionMultiplier}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Young-driver surcharge</span><span>+${breakdown.youngDriverSurcharge.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>High-risk surcharge</span><span>+${breakdown.highRiskSurcharge.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Deductible adjustment</span><span>+${breakdown.deductibleAdjust.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--success)' }}><span>Discounts</span><span>-${breakdown.discounts.toFixed(2)}</span></div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.6rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}><span>Final premium</span><span data-testid="premium-total">${breakdown.finalPremium}</span></div>

              <h3 style={{ marginTop: '1.25rem', marginBottom: '0.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>Multipliers &amp; adjustments</h3>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {breakdown.notes.map((n, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const InsuranceApp = () => (
  <QALayout>
    <InsuranceInner />
  </QALayout>
);
