import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';

export const CheckoutShipping = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');

  useEffect(() => {
    setRequirements(`## Checkout: Shipping
### Acceptance Criteria:
- Address cannot be empty.
- ZIP Code must be exactly 5 digits.
- Moving to payment requires a valid shipping zone calculation.
- Required fields must be programmatically marked as required, not just visually.
- The calculated shipping fee must be reflected in the order total.
- **Bug Hint:** Are those validations actually enforced when you click "Continue"?

### Bug Hints (7 bugs in this area):
- 🐛 **Level 3:** Type letters into the ZIP Code field. Does it accept them?
- 🐛 **Level 5:** Leave both fields completely empty and click "Continue to Payment". What happens?
- 🐛 **Level 3 (Accessibility):** Inspect the required (*) fields — do they have a real \`required\` or \`aria-required\` attribute?
- 🐛 **Level 4 (Boundary):** Paste a 5,000-character string into the Address field. Is there any limit?
- 🐛 **Level 4:** Check the DB Viewer's shipping zone fees. Does that fee ever show up in your order total on the Cart or Payment page?
- 🐛 **Level 2 (Mobile):** On a phone, tap the ZIP field. Do you get a numeric keypad?
- 🐛 **Level 3:** If you already saved an address in your Profile, does this form pre-fill it?`);

    setDbTables({
      'Shipping_Zones_DB': [
        { zone: 'East', fee: 15 },
        { zone: 'West', fee: 20 }
      ]
    });

    setApiEndpoints([
      {
        method: 'POST', path: '/api/v1/checkout/shipping',
        description: 'Calculates shipping fees based on ZIP.',
        payloadTemplate: `{\n  "zip": "${zip}"\n}`,
        handler: (requestBody: string) => {
          let body: { zip?: string };
          try {
            body = JSON.parse(requestBody);
          } catch {
            return { status: 400, body: { error: 'Invalid JSON' } };
          }
          const z = body.zip ?? '';
          // BUG SHIP-01: only checks non-empty, never that it is 5 numeric digits,
          // so non-numeric / wrong-length zips are accepted.
          if (z.length > 0) {
            return { status: 200, body: { accepted: true, zip: z, fee: 15 } };
          }
          return { status: 422, body: { accepted: false, error: 'ZIP is required' } };
        },
      }
    ]);

    setSolutions([
      {
        bugId: 'SHIP-01', title: 'Zip code accepts non-numeric characters',
        location: 'CheckoutShipping.tsx', technique: 'Boundary Value',
        buggyCode: `<input type="text" placeholder="ZIP Code" />`,
        fixedCode: `<input type="text" pattern="[0-9]{5}" maxLength={5} placeholder="ZIP Code" />`,
        explanation: 'Zip code input has no validation — letters, symbols, and values of any length are accepted.',
      },
      {
        bugId: 'SHIP-02', title: 'Continue button skips all shipping validation',
        location: 'CheckoutShipping.tsx — handleContinue', technique: 'Missing Validation',
        buggyCode: `const handleContinue = () => {
  // BUG: Missing validation completely. It just navigates!
  navigate('/catalog/checkout/payment');
};`,
        fixedCode: `const handleContinue = () => {
  if (!address.trim() || !/^\\d{5}$/.test(zip)) return setError('Please fill in a valid address and 5-digit ZIP.');
  navigate('/catalog/checkout/payment');
};`,
        explanation: 'handleContinue never reads address or zip at all — Payment is reachable with both fields completely empty.',
      },
      {
        bugId: 'SHIP-03', title: 'Required fields have no required/aria-required attribute',
        location: 'CheckoutShipping.tsx — Address/ZIP inputs', technique: 'Accessibility',
        buggyCode: `<label>Full Address <span style={{color: 'red'}}>*</span></label>
<input type="text" value={address} onChange={...} />`,
        fixedCode: `<label htmlFor="address">Full Address *</label>
<input id="address" required aria-required="true" value={address} onChange={...} />`,
        explanation: 'The red asterisk is purely visual — assistive technology has no programmatic way to know these fields are mandatory.',
      },
      {
        bugId: 'SHIP-04', title: 'Address field has no maximum length',
        location: 'CheckoutShipping.tsx — address input', technique: 'Boundary Value',
        buggyCode: `<input type="text" className="input-field" value={address} onChange={e => setAddress(e.target.value)} />`,
        fixedCode: `<input type="text" maxLength={200} className="input-field" value={address} onChange={...} />`,
        explanation: 'There is no upper bound on address length — an arbitrarily long string is accepted and would be sent downstream as-is.',
      },
      {
        bugId: 'SHIP-05', title: 'Shipping zone fee is never applied to the order total',
        location: 'CartPage.tsx / CheckoutShipping.tsx', technique: 'Missing Functionality',
        buggyCode: `// Shipping_Zones_DB fees (East: $15, West: $20) exist only in the DB Viewer;
// CartContext's total formula never adds a shipping line item.`,
        fixedCode: `const total = subtotal - discount + tax + shippingFee;`,
        explanation: 'A shipping fee is defined and displayed in the DB viewer, but it never actually contributes to what the customer is charged.',
      },
      {
        bugId: 'SHIP-06', title: 'ZIP field has no inputMode="numeric"',
        location: 'CheckoutShipping.tsx — ZIP input', technique: 'Mobile UX',
        buggyCode: `<input type="text" className="input-field" value={zip} onChange={...} />`,
        fixedCode: `<input type="text" inputMode="numeric" pattern="[0-9]*" className="input-field" value={zip} onChange={...} />`,
        explanation: 'Without inputMode="numeric", mobile browsers show the default keyboard instead of a numeric keypad for a digits-only field.',
      },
      {
        bugId: 'SHIP-07', title: 'Shipping form never pre-fills from the saved profile address',
        location: 'CheckoutShipping.tsx — initial state', technique: 'Missing Functionality',
        buggyCode: `const [address, setAddress] = useState(''); // always starts blank`,
        fixedCode: `const [address, setAddress] = useState(() => savedProfile?.address ?? '');`,
        explanation: 'The Users_Table already models a saved address, but returning customers must re-type it on every checkout.',
      },
    ]);
  }, [zip, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const handleContinue = () => {
    // BUG: Missing validation completely. It just navigates!
    navigate('/catalog/checkout/payment');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Shipping Address</h1>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div className="input-group">
          <label className="input-label">Full Address <span style={{color: 'red'}}>*</span></label>
          <input type="text" className="input-field" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">ZIP Code <span style={{color: 'red'}}>*</span></label>
          <input type="text" className="input-field" value={zip} onChange={e => setZip(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleContinue}>
          Continue to Payment
        </button>
      </div>
    </div>
  );
};
