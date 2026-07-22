import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';

export const Checkout = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
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

    setRemoteSolutions({ app: 'ecommerce', bugIds: ['ECO-03', 'ECO-10', 'ECO-11', 'ECO-30', 'ECO-47', 'ECO-48', 'ECO-49', 'ECO-50', 'ECO-51', 'ECO-52'] });
  }, [subtotal, finalTotal, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

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
