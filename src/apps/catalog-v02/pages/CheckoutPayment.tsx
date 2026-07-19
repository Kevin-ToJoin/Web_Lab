import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { useCart } from '../context/CartContext';

export const CheckoutPayment = () => {
  const navigate = useNavigate();
  const { total } = useCart();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  
  const [card, setCard] = useState('');

  useEffect(() => {
    setRequirements(`## Checkout: Payment
### Acceptance Criteria:
- The charged amount must exactly match the Cart total (no rounding or modification).
- Card number must be 16 digits and pass the **Luhn algorithm** check.
- Expiry date must be in MM/YY format and must not be in the past.
- CVC must be exactly 3 digits.
- The "Authorize Payment" button must be **disabled** while a payment request is processing to prevent double charges.
- On success, redirect to the Order Confirmation page.

### Bug Hints (7 bugs on this page):
- 🐛 **Level 4 (Equivalence):** Enter a clearly invalid card number like \`1234 5678 9012 3456\` or \`0000 0000 0000 0000\`. Does the form reject it?
- 🐛 **Level 4 (Equivalence):** Leave the Expiry and CVC fields empty and click Authorize. Does validation fire?
- 🐛 **Level 8 (Race Condition):** Click the "Authorize Payment" button **twice very quickly**. Check the Transactions Ledger — how many charge requests were sent?
- 🐛 **Level 3 (Boundary):** Try typing 40 digits into the Card Number field. Is there any limit or formatting?
- 🐛 **Level 7:** Open the Cart in another step of the flow, note the total, then imagine it changed before you clicked Authorize. Is the charged amount ever re-checked at that moment?
- 🐛 **Level 2 (UX):** Type a 16-digit card number. Does it space itself out like the example format shown above?
- 🐛 **Level 2:** Is there any way to go back to the Shipping step from this page?

### Expected Card Validation:
\`\`\`
Card:   16 digits, Luhn-valid  (e.g. 4532015112830366 ✓)
Expiry: MM/YY, not in past     (e.g. 12/99 ✓, 01/20 ✗)
CVC:    exactly 3 digits       (e.g. 123 ✓, abc ✗)
\`\`\``);

    setDbTables({
      'Transactions_Ledger': [
        { note: 'No transactions yet — each successful "Authorize Payment" click should add one entry here.' }
      ],
      'Payment_Rules': [
        { field: 'card_number', rule: '16 digits, Luhn algorithm' },
        { field: 'expiry', rule: 'MM/YY format, must be future date' },
        { field: 'cvc', rule: 'exactly 3 numeric digits' },
        { field: 'amount', rule: `must equal cart total: $${total.toFixed(2)}` }
      ]
    });

    setApiEndpoints([
      {
        method: 'POST',
        path: '/api/v1/payment/charge',
        description: 'Initiates the payment charge. Should only be called once per order. Each click of "Authorize Payment" triggers one call.',
        payloadTemplate: `{\n  "amount": ${total},\n  "card": "${card || ''}",\n  "expiry": "MM/YY",\n  "cvc": ""\n}`,
        handler: (requestBody: string) => {
          let body: { amount?: number; card?: string; expiry?: string; cvc?: string };
          try {
            body = JSON.parse(requestBody);
          } catch {
            return { status: 400, body: { error: 'Invalid JSON' } };
          }
          // BUG PAY-01/PAY-02: no Luhn check, no expiry/cvc validation — an
          // obviously invalid card is accepted and charged.
          return {
            status: 200,
            body: {
              charged: true,
              amount: body.amount,
              card: body.card,
              transactionId: `TXN-${Math.floor(Math.random() * 100000)}`,
            },
          };
        },
      }
    ]);

    setSolutions([
      {
        bugId: 'PAY-01', title: 'Card number not Luhn-validated',
        location: 'CheckoutPayment.tsx', technique: 'Equivalence Partitioning',
        buggyCode: `// no card validation before calling handlePay`,
        fixedCode: `function luhn(n: string) {
  return [...n].reverse().reduce((s,d,i) => {
    let v = +d; if (i%2) { v*=2; if(v>9) v-=9; } return s+v;
  }, 0) % 10 === 0;
}
if (!luhn(card.replace(/\\s/g,''))) { setError('Invalid card'); return; }`,
        explanation: 'Any 16-character string passes as a valid card. The Luhn algorithm check is missing entirely.',
      },
      {
        bugId: 'PAY-02', title: 'Expiry and CVC have no validation',
        location: 'CheckoutPayment.tsx', technique: 'Equivalence Partitioning',
        buggyCode: `// handlePay navigates immediately without checking expiry or cvc`,
        fixedCode: `if (!/^(0[1-9]|1[0-2])\\/\\d{2}$/.test(expiry)) return setError('Invalid expiry');
if (!/^\\d{3}$/.test(cvc)) return setError('Invalid CVC');`,
        explanation: 'Expiry and CVC inputs are uncontrolled and never validated — empty or malformed values are silently accepted.',
      },
      {
        bugId: 'PAY-03', title: 'Double-submit race condition on Authorize button',
        location: 'CheckoutPayment.tsx', technique: 'Race Condition',
        buggyCode: `<button onClick={handlePay}>Authorize Payment</button>`,
        fixedCode: `const [loading, setLoading] = useState(false);
<button disabled={loading} onClick={async () => { setLoading(true); await handlePay(); }}>
  {loading ? 'Processing...' : 'Authorize Payment'}
</button>`,
        explanation: 'The button stays enabled during processing. Rapid double-click sends two charge requests to the payment API.',
      },
      {
        bugId: 'PAY-04', title: 'Card number field has no maxLength or formatting',
        location: 'CheckoutPayment.tsx — card input', technique: 'Boundary Value',
        buggyCode: `<input type="text" className="input-field" value={card} onChange={e => setCard(e.target.value)} placeholder="0000 0000 0000 0000" />`,
        fixedCode: `<input type="text" maxLength={19} value={formatCardNumber(card)} onChange={...} placeholder="0000 0000 0000 0000" />`,
        explanation: 'Any length or character set can be typed into the card field — there is no client-side constraint matching the 16-digit requirement.',
      },
      {
        bugId: 'PAY-05', title: 'Charged amount is never re-validated at charge time',
        location: 'CheckoutPayment.tsx — handlePay', technique: 'Data Integrity',
        buggyCode: `const { total } = useCart(); // read once at render
const handlePay = () => { navigate('/catalog/checkout/success'); }; // never re-checks total`,
        fixedCode: `const handlePay = () => {
  const current = useCart().total; // re-derive at click time
  chargeCard(current);
};`,
        explanation: 'The charge amount is whatever `total` happened to be at the last render — nothing re-verifies it matches the cart immediately before authorizing.',
      },
      {
        bugId: 'PAY-06', title: 'Card number has no auto-formatting as you type',
        location: 'CheckoutPayment.tsx — card input', technique: 'UX',
        buggyCode: `value={card} onChange={e => setCard(e.target.value)} // raw digits, no grouping`,
        fixedCode: `onChange={e => setCard(formatWithSpaces(e.target.value))} // "4532 0151 1283 0366"`,
        explanation: 'The requirements show a spaced example format, but the input never groups digits — every real payment form does this for readability.',
      },
      {
        bugId: 'PAY-07', title: 'No "Back to Shipping" link exists on this page',
        location: 'CheckoutPayment.tsx — page layout', technique: 'Missing Functionality',
        buggyCode: `<h1>Payment Details</h1>
{/* every other checkout step has a back button — this one doesn't */}`,
        fixedCode: `<button onClick={() => navigate('/catalog/checkout/shipping')}>
  <ArrowLeft size={18} /> Back to Shipping
</button>`,
        explanation: 'Unlike Cart and Shipping, this page gives no way to correct a mistyped address without using the browser\'s Back button.',
      },
    ]);
  }, [total, card, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const handlePay = () => {
    // BUG: Race condition / Double submission
    // Button doesn't disable while processing!
    navigate('/catalog/checkout/success');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Payment Details</h1>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Total to charge: <span style={{ color: 'var(--primary)' }}>${total.toFixed(2)}</span></h2>
        
        <div className="input-group">
          <label className="input-label">Card Number</label>
          <input type="text" className="input-field" value={card} onChange={e => setCard(e.target.value)} placeholder="0000 0000 0000 0000" />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Expiry</label>
            <input type="text" className="input-field" placeholder="MM/YY" />
          </div>
          <div className="input-group">
            <label className="input-label">CVC</label>
            <input type="text" className="input-field" placeholder="123" />
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handlePay}>
          Authorize Payment
        </button>
      </div>
    </div>
  );
};
