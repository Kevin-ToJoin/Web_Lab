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

### Bug Hints (3 bugs on this page):
- 🐛 **Level 4 (Equivalence):** Enter a clearly invalid card number like \`1234 5678 9012 3456\` or \`0000 0000 0000 0000\`. Does the form reject it?
- 🐛 **Level 4 (Equivalence):** Leave the Expiry and CVC fields empty and click Authorize. Does validation fire?
- 🐛 **Level 8 (Race Condition):** Click the "Authorize Payment" button **twice very quickly**. Check the Transactions Ledger — how many charge requests were sent?

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
