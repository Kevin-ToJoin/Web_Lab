import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';

export const Checkout = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const { subtotal, finalTotal, placeOrder } = useCart();
  // BUG ECO-30: savedAddress/savedEmail from CartContext are intentionally never
  // read here — the form always starts blank instead of pre-filling.

  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [card, setCard] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState('');

  useEffect(() => {
    setRequirements(`## Checkout
### Acceptance Criteria:
- Shipping address must not be empty.
- Email must be a valid email format.
- Card number must be 16 digits and pass the Luhn algorithm.
- The Complete Checkout button must be disabled while the cart is empty **and** while an order is being placed.
- If the customer has a saved profile address, it should pre-fill here.
- On success, the customer should land on an Order Confirmation page with a unique order ID.

### Bug Hints (10 bugs on this page):
- 🐛 **Level 4:** Leave the address field empty and click "Complete Checkout". Does it succeed?
- 🐛 **Level 4:** Type an obviously invalid email like "not-an-email" and check out. Any validation?
- 🐛 **Level 5:** With an empty cart, is the "Complete Checkout" button clickable at all?
- 🐛 **Level 3:** If you saved an address on your Profile page, does it appear here automatically?
- 🐛 **Level 4:** Enter an obviously invalid card number like \`0000 0000 0000 0000\`. Does it get rejected?
- 🐛 **Level 4:** Leave the card field empty entirely and click Complete Checkout.
- 🐛 **Level 8 (Race Condition):** Click "Complete Checkout" twice very quickly. Check Order History — how many orders got placed?
- 🐛 **Level 3 (Boundary):** Try typing 30 digits into the Card Number field. Any limit?
- 🐛 **Level 3 (Accessibility):** Inspect the required (*) fields — do they have a real \`required\`/\`aria-required\` attribute?
- 🐛 **Level 2:** Does this page show which items you're actually paying for, or only the total?`);

    setDbTables({ Cart_Total: [{ subtotal: subtotal.toFixed(2), total: finalTotal.toFixed(2) }] });
    setApiEndpoints([
      {
        method: 'POST', path: '/api/orders', description: 'Places the order with the current cart total.',
        payloadTemplate: `{\n  "address": "",\n  "email": "",\n  "card": "",\n  "total": ${finalTotal}\n}`,
        handler: (requestBody: string) => {
          try {
            const body = JSON.parse(requestBody || '{}');
            // BUG ECO-03/ECO-11/ECO-47: no server-side validation either — anything is accepted.
            return { status: 200, body: { placed: true, total: body.total } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ]);

    const solutions: BugSolution[] = [
      {
        bugId: 'ECO-03', title: 'Address not validated', location: 'Checkout.tsx — handleCheckout()',
        technique: 'Missing Validation',
        buggyCode: 'if (subtotal <= 0) { ... }\n// no address check',
        fixedCode: 'if (address.trim() === "") {\n  setCheckoutStatus("Error: Address is required.");\n  return;\n}',
        explanation: 'Checkout proceeds with a blank address. Validate before placing the order.',
      },
      {
        bugId: 'ECO-10', title: 'Checkout enabled on empty cart', location: 'Checkout.tsx — checkout button',
        technique: 'Logic Error',
        buggyCode: '<button className="btn btn-primary" onClick={handleCheckout}>',
        fixedCode: '<button disabled={subtotal <= 0} onClick={handleCheckout}>',
        explanation: 'The button is always clickable; disable it when the cart is empty.',
      },
      {
        bugId: 'ECO-11', title: 'Email not validated', location: 'Checkout.tsx — handleCheckout()',
        technique: 'Missing Validation',
        buggyCode: '// no email validation before placing order',
        fixedCode: 'if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {\n  setCheckoutStatus("Error: Invalid email."); return;\n}',
        explanation: 'Orders accept any email. Validate the format before checkout.',
      },
      {
        bugId: 'ECO-30', title: 'Checkout form never pre-fills from the saved profile',
        location: 'Checkout.tsx — initial state', technique: 'Missing Functionality',
        buggyCode: `const [address, setAddress] = useState(''); // ignores savedAddress from CartContext`,
        fixedCode: `const [address, setAddress] = useState(savedAddress);`,
        explanation: 'A saved address exists (see Profile page) but returning customers must re-type it on every order.',
      },
      {
        bugId: 'ECO-47', title: 'Card number is not Luhn-validated',
        location: 'Checkout.tsx — handleCheckout()', technique: 'Equivalence Partitioning',
        buggyCode: `// no card validation before calling placeOrder`,
        fixedCode: `function luhn(n: string) { /* standard Luhn check */ }
if (!luhn(card.replace(/\\s/g, ''))) return setCheckoutStatus('Error: Invalid card.');`,
        explanation: 'Any 16-character string passes as a valid card — there is no Luhn algorithm check at all.',
      },
      {
        bugId: 'ECO-48', title: 'Empty card field is accepted',
        location: 'Checkout.tsx — handleCheckout()', technique: 'Missing Validation',
        buggyCode: `// card state is read but never checked for emptiness`,
        fixedCode: `if (!card.trim()) return setCheckoutStatus('Error: Card number is required.');`,
        explanation: 'Leaving the card field completely blank still places the order successfully.',
      },
      {
        bugId: 'ECO-49', title: 'Double-click on Complete Checkout can place two orders',
        location: 'Checkout.tsx — handleCheckout()', technique: 'Race Condition',
        buggyCode: `<button onClick={handleCheckout}>Complete Checkout</button>
// no disabled/loading state during placeOrder()`,
        fixedCode: `const [placing, setPlacing] = useState(false);
<button disabled={placing} onClick={async () => { setPlacing(true); await handleCheckout(); }}>`,
        explanation: 'The button stays clickable while the order is being placed — a fast double-click submits twice.',
      },
      {
        bugId: 'ECO-50', title: 'Card number field has no maxLength or formatting',
        location: 'Checkout.tsx — card input', technique: 'Boundary Value',
        buggyCode: `<input value={card} onChange={e => setCard(e.target.value)} placeholder="0000 0000 0000 0000" />`,
        fixedCode: `<input maxLength={19} value={formatCardNumber(card)} onChange={...} placeholder="0000 0000 0000 0000" />`,
        explanation: 'Any length or character set can be typed into the card field, with no grouping or cap.',
      },
      {
        bugId: 'ECO-51', title: 'Required fields show a red asterisk but have no required/aria-required attribute',
        location: 'Checkout.tsx — Email/Address/Card inputs', technique: 'Accessibility',
        buggyCode: `<label>Email <span style={{color:'red'}}>*</span></label>\n<input value={email} onChange={...} />`,
        fixedCode: `<label htmlFor="email">Email *</label>\n<input id="email" required aria-required="true" value={email} onChange={...} />`,
        explanation: 'The red asterisk is purely visual — assistive technology has no programmatic way to know these fields are mandatory.',
      },
      {
        bugId: 'ECO-52', title: 'No order summary (items) shown at checkout',
        location: 'Checkout.tsx — page body', technique: 'Missing Functionality',
        buggyCode: `<h2>Total: \${finalTotal.toFixed(2)}</h2>\n{/* no line items listed anywhere on this page */}`,
        fixedCode: `{cartLines.map(line => <CheckoutLineItem key={line.id} {...line} />)}`,
        explanation: 'The customer commits to paying a total with no visible breakdown of what they\'re actually buying on this page.',
      },
    ];
    setSolutions(solutions);
  }, [subtotal, finalTotal, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const handleCheckout = () => {
    // BUG ECO-10: no disabled state backs this up structurally, only this late guard.
    if (subtotal <= 0) {
      setCheckoutStatus('Error: Cart is empty.');
      return;
    }
    // BUG ECO-03 / ECO-11 / ECO-47 / ECO-48: address, email, and card are never
    // actually validated here.
    const order = placeOrder(address, email);
    setCheckoutStatus('Success! Redirecting...');
    setTimeout(() => navigate(`/ecommerce/confirmation/${order.id}`), 600);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/ecommerce/cart')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Cart
      </button>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Checkout</h1>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Total: <span style={{ color: 'var(--primary)' }}>${finalTotal.toFixed(2)}</span></h2>
        <div className="input-group">
          <label className="input-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input-field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="input-group" style={{ marginTop: '1rem' }}>
          <label className="input-label">Shipping Address <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea className="input-field" rows={3} placeholder="Enter your address..." value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="input-group" style={{ marginTop: '1rem' }}>
          <label className="input-label">Card Number <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input className="input-field" placeholder="0000 0000 0000 0000" value={card} onChange={(e) => setCard(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }} onClick={handleCheckout}>
          <CreditCard size={18} /> Complete Checkout
        </button>
        {checkoutStatus && (
          <div style={{
            marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius-md)',
            background: checkoutStatus.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: checkoutStatus.includes('Error') ? 'var(--danger)' : 'var(--success)', fontWeight: 500,
          }}>{checkoutStatus}</div>
        )}
      </div>
    </div>
  );
};
