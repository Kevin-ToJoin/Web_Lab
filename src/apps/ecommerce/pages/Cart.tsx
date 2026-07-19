import { useEffect } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS } from '../data/mockStore';

export const Cart = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const {
    cart, updateQuantity, removeItem, subtotal, discount, discountApplied,
    discountCode, setDiscountCode, applyDiscount, tax, shipping, finalTotal,
  } = useCart();

  useEffect(() => {
    setRequirements(`## Shopping Cart
### Acceptance Criteria:
- Removing an item must remove exactly that item, not another one.
- Free shipping applies at $100 or more (>= 100).
- Discount codes must be matched case-insensitively.
- An invalid discount code must show a clear error.
- The subtotal must always be current, even right after a removal.

### Bug Hints (10 bugs on this page):
- 🐛 **Level 3 (Data Integrity):** Add 3 different products, then remove the *second* one. Which item actually disappears?
- 🐛 **Level 4 (Equivalence):** Get your subtotal to exactly $100.00. Do you get free shipping?
- 🐛 **Level 4 (Equivalence):** Try the discount code \`save10\` in lowercase. Does it work?
- 🐛 **Level 2:** Apply an obviously invalid discount code. Do you see any error message?
- 🐛 **Level 5 (Stale State):** Remove an item, then immediately look at the subtotal. Is it updated?
- 🐛 **Level 3 (Boundary):** Type \` SAVE10 \` with a leading/trailing space. Does it still apply?
- 🐛 **Level 5 (Stale State):** Apply a discount, empty your cart, then add a new item. Is the discount still applied?
- 🐛 **Level 2 (Accessibility):** Inspect the +/-/Remove buttons on a line item — do they have any accessible label?
- 🐛 **Level 2 (Accessibility):** Do the line item product images have alt text?
- 🐛 **Level 3 (Accessibility):** Click +/- with a screen reader running — does it announce the new quantity?`);

    setDbTables({
      Cart_Lines: cart.filter(c => c.quantity > 0).map(c => {
        const p = PRODUCTS.find(x => x.id === c.id);
        return { id: c.id, name: p?.name, price: p?.price, qty: c.quantity, lineTotal: (p?.price ?? 0) * c.quantity };
      }),
      Discount_Codes: [{ code: 'SAVE10', percentOff: 10, active: true }],
      Shipping_Rule: [{ threshold: 100.0, fee: 0.0, label: 'Free shipping >= $100' }, { threshold: 0, fee: 15.0, label: 'Standard' }],
    });

    setApiEndpoints([
      {
        method: 'POST', path: '/api/discount/apply',
        description: 'Validates a discount code. (Reflects the case-sensitive matching bug.)',
        payloadTemplate: '{\n  "code": "save10"\n}',
        handler: (requestBody: string) => {
          try {
            const { code } = JSON.parse(requestBody || '{}');
            // BUG ECO-06: case-sensitive equality — "save10" is rejected.
            if (code === 'SAVE10') return { status: 200, body: { valid: true, percentOff: 10 } };
            return { status: 404, body: { valid: false, error: 'Unknown discount code' } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST', path: '/api/shipping/quote',
        description: 'Returns shipping cost for a subtotal. (Reflects the > 100 boundary bug.)',
        payloadTemplate: '{\n  "subtotal": 100\n}',
        handler: (requestBody: string) => {
          try {
            const { subtotal: sub } = JSON.parse(requestBody || '{}');
            const n = Number(sub);
            const fee = n > 100 ? 0 : 15.0;
            return { status: 200, body: { subtotal: n, shipping: fee, freeShipping: fee === 0 } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ]);

    const solutions: BugSolution[] = [
      {
        bugId: 'ECO-02', title: 'Free shipping boundary off-by-one', location: 'CartContext.tsx — shipping calc',
        technique: 'Equivalence Partitioning',
        buggyCode: 'const shipping = subtotal > 100 ? 0 : 15.0;',
        fixedCode: 'const shipping = subtotal >= 100 ? 0 : 15.0;',
        explanation: 'Requirement is "$100 or more". Using > 100 charges shipping at exactly $100.',
      },
      {
        bugId: 'ECO-06', title: 'Discount code is case-sensitive', location: 'CartContext.tsx — applyDiscount()',
        technique: 'Equivalence Partitioning',
        buggyCode: "if (discountCode === 'SAVE10') {",
        fixedCode: "if (discountCode.trim().toUpperCase() === 'SAVE10') {",
        explanation: 'Coupon codes should be case-insensitive; "save10" is wrongly rejected.',
      },
      {
        bugId: 'ECO-13', title: 'Subtotal rounding error', location: 'CartContext.tsx — subtotal effect',
        technique: 'Precision Error',
        buggyCode: 'setSubtotal(cart.reduce((a, i) => a + price * i.quantity, 0));',
        fixedCode: 'setSubtotal(Math.round(cart.reduce((a, i) => a + price * i.quantity, 0) * 100) / 100);',
        explanation: 'Float accumulation produces values like 37.489999. Round to cents.',
      },
      {
        bugId: 'ECO-14', title: 'Remove deletes wrong item', location: 'CartContext.tsx — removeItem()',
        technique: 'Data Integrity',
        buggyCode: 'const firstActiveIdx = prev.findIndex(i => i.quantity !== 0);\n// removes first active, not the one clicked',
        fixedCode: 'return prev.map(item => item.id === id ? { ...item, quantity: 0 } : item);',
        explanation: 'Removal targets the first active line instead of the clicked id. Match by id.',
      },
      {
        bugId: 'ECO-29', title: 'Invalid discount code shows no error message',
        location: 'CartContext.tsx — applyDiscount()', technique: 'Missing Functionality',
        buggyCode: `const applyDiscount = () => {
  if (discountCode === 'SAVE10') setDiscountApplied(true);
  else setDiscountApplied(false); // no error feedback
};`,
        fixedCode: `else { setDiscountApplied(false); setDiscountError('Invalid discount code.'); }`,
        explanation: 'Entering a bad code just silently fails to apply — there is no message telling the shopper why.',
      },
      {
        bugId: 'ECO-53', title: 'Discount code with whitespace is rejected',
        location: 'CartContext.tsx — applyDiscount()', technique: 'Boundary Value',
        buggyCode: `if (discountCode === 'SAVE10') { ... } // " SAVE10 " fails the exact match`,
        fixedCode: `if (discountCode.trim().toUpperCase() === 'SAVE10') { ... }`,
        explanation: 'An accidental leading/trailing space silently defeats an otherwise-valid code.',
      },
      {
        bugId: 'ECO-54', title: 'Discount stays applied after the cart empties out',
        location: 'CartContext.tsx — discountApplied state', technique: 'Stale State',
        buggyCode: `// discountApplied is never reset when cart.every(i => i.quantity === 0)`,
        fixedCode: `useEffect(() => { if (subtotal === 0) setDiscountApplied(false); }, [subtotal]);`,
        explanation: 'Emptying the cart doesn\'t clear an applied discount, so the next item added inherits a stale 10% off.',
      },
      {
        bugId: 'ECO-55', title: 'Quantity +/- and Remove buttons have no accessible label',
        location: 'Cart.tsx — line item controls', technique: 'Accessibility',
        buggyCode: `<button onClick={() => updateQuantity(line.id, -1)}>-</button>\n<button onClick={() => removeItem(line.id)}><Trash2 size={16} /></button>`,
        fixedCode: `<button aria-label={\`Decrease quantity of \${p.name}\`} onClick={...}>-</button>\n<button aria-label={\`Remove \${p.name}\`} onClick={...}><Trash2 aria-hidden="true" /></button>`,
        explanation: 'A bare "-"/"+" or icon-only Trash2 button gives a screen reader no idea which line item it affects.',
      },
      {
        bugId: 'ECO-56', title: 'Cart line item images have no alt text',
        location: 'Cart.tsx — line item image', technique: 'Accessibility',
        buggyCode: `<img src={p.image} style={{ ... }} /> // no alt`,
        fixedCode: `<img src={p.image} alt={p.name} style={{ ... }} />`,
        explanation: 'Screen-reader users get no description of which product each thumbnail represents.',
      },
      {
        bugId: 'ECO-57', title: 'Quantity value has no aria-live region',
        location: 'Cart.tsx — quantity display', technique: 'Accessibility',
        buggyCode: `<span>{line.quantity}</span> // updates silently on +/- clicks`,
        fixedCode: `<span aria-live="polite">{line.quantity}</span>`,
        explanation: 'A screen-reader user clicking +/- gets no announcement that the quantity actually changed.',
      },
    ];
    setSolutions(solutions);
  }, [cart, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  const activeItems = cart.filter(c => c.quantity > 0);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/ecommerce')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Continue Shopping
      </button>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Your Cart</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeItems.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Your cart is empty.</div>
          ) : activeItems.map(line => {
            const p = PRODUCTS.find(x => x.id === line.id)!;
            return (
              <div key={line.id} className="glass-panel" style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'center' }}>
                <img src={p.image} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem' }}>{p.name}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>${p.price.toFixed(2)} each</div>
                </div>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateQuantity(line.id, -1)}>-</button>
                <span style={{ minWidth: '24px', textAlign: 'center' }}>{line.quantity}</span>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateQuantity(line.id, 1)}>+</button>
                <button className="btn btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => removeItem(line.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Order Summary</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          {discountApplied && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--success)' }}><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}><span>Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input className="input-field" style={{ flex: 1 }} placeholder="Discount code" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
            <button className="btn btn-secondary" onClick={applyDiscount}>Apply</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
            <span>Total</span><span style={{ color: 'var(--primary)' }}>${finalTotal.toFixed(2)}</span>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }} onClick={() => navigate('/ecommerce/checkout')}>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};
