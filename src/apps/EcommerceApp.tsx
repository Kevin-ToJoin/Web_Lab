import { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Trash2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

const TAX_RATE = 0.08;

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

const PRODUCTS: Product[] = [
  { id: 101, name: 'Premium Coffee Beans', price: 24.99, stock: 8 },
  { id: 102, name: 'Ceramic Mug', price: 12.50, stock: 3 },
  { id: 103, name: 'Pour-over Coffee Maker', price: 35.00, stock: 0 },
  { id: 104, name: 'Electric Grinder', price: 75.00, stock: 5 },
];

interface CartLine extends Product {
  quantity: number;
}

const EcommerceInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [cart, setCart] = useState<CartLine[]>(PRODUCTS.map(p => ({ ...p, quantity: 0 })));
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('');

  // BUG ECO-07 (L5 Stale State): the header badge count is tracked in its own
  // state and only updated on add-to-cart, so it goes stale after +/-/remove.
  const [badgeCount, setBadgeCount] = useState(0);

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        // BUG ECO-01 (L3 Boundary): no Math.max(0, ...) so quantity can go negative.
        // BUG ECO-05 (L3 Boundary): no upper bound, can exceed item.stock.
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    }));
  };

  const setQuantityRaw = (id: number, value: string) => {
    // BUG ECO-09 (L3 Boundary): parseFloat accepts decimals like 1.5 (should be integer-only).
    const num = parseFloat(value);
    setCart(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: isNaN(num) ? 0 : num } : item
    ));
  };

  const addToCart = (id: number) => {
    // BUG ECO-12 (L4 Logic): no stock===0 guard, out-of-stock items still added.
    updateQuantity(id, 1);
    setBadgeCount(c => c + 1);
  };

  const removeItem = (id: number) => {
    // BUG ECO-14 (L3 Data Integrity): removes by array index of the FIRST active
    // line rather than the matching id, so it removes the wrong item.
    setCart(prev => {
      const firstActiveIdx = prev.findIndex(i => i.quantity !== 0);
      return prev.map((item, idx) =>
        idx === firstActiveIdx ? { ...item, quantity: 0 } : item
      );
    });
    // BUG ECO-04 (L5 Stale State): does not trigger total recalculation here.
    void id;
  };

  // BUG ECO-04 (L5 Stale State): subtotal is cached in state and the effect skips
  // recalculation when an item is removed (active count drops), leaving it stale.
  const [subtotal, setSubtotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const active = cart.filter(i => i.quantity > 0);
    if (active.length < activeCount) {
      // Bug: an item was removed — skip recompute (simulated stale cache).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveCount(active.length);
      return;
    }
    // BUG ECO-13 (L4 Precision): naive float accumulation, no cent rounding.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubtotal(cart.reduce((acc, item) => acc + item.price * item.quantity, 0));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCount(active.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  // BUG ECO-02 (L4 Equivalence): uses > 100 instead of >= 100; exactly $100 pays shipping.
  const shipping = subtotal > 100 ? 0 : 15.0;
  // BUG ECO-06 (L4 Equivalence): case-sensitive discount comparison.
  const discount = discountApplied ? subtotal * 0.1 : 0;
  // BUG ECO-08 (L4 Equivalence): cart total adds tax, but product list prices omit it.
  const tax = subtotal * TAX_RATE;
  const finalTotal = subtotal - discount + tax + shipping;

  const applyDiscount = () => {
    // BUG ECO-06: should be toUpperCase()/case-insensitive comparison.
    if (discountCode === 'SAVE10') {
      setDiscountApplied(true);
      setCheckoutStatus('Discount applied!');
    } else {
      setDiscountApplied(false);
      setCheckoutStatus('Error: Invalid discount code.');
    }
  };

  const handleCheckout = () => {
    // BUG ECO-03 (L4 Missing Validation): no address.trim() check.
    // BUG ECO-11 (L4 Missing Validation): no email format check.
    // BUG ECO-10 (L5 Logic): button stays enabled with empty cart; only a late
    // guard here catches it instead of disabling the control.
    if (subtotal <= 0) {
      setCheckoutStatus('Error: Cart is empty.');
      return;
    }
    setCheckoutStatus('Success! Order placed successfully. (Simulated)');
  };

  useEffect(() => {
    setRequirements(`## E-commerce Store — "Bean & Brew"

Customers browse coffee products, manage a cart and check out.

### Functional Requirements
- **Cart quantity** must be an integer between **0** and the item's available **stock**. It can never go negative or exceed stock.
- **Free shipping** applies to orders of **$100 or more** (>= 100). Otherwise shipping is **$15.00**.
- **Tax** of **8%** is applied consistently to displayed prices in both the product list and the cart.
- **Discount codes** (e.g. \`SAVE10\` = 10% off) are matched **case-insensitively**.
- **Out-of-stock** items (stock = 0) cannot be added to the cart.
- The **cart count badge** in the header must always reflect the current total quantity.
- The **subtotal** must always recompute when items change (including removals) and be rounded to **2 decimal places**.
- **Checkout** requires a **non-empty shipping address** and a **valid email**; the checkout button is **disabled** when the cart is empty.
- **Remove** must delete the exact item selected.

### Levels
14 bugs, difficulty levels 3-5 (boundary, equivalence, missing validation, stale state, logic, precision, data integrity).`);

    setDbTables({
      products: PRODUCTS.map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock })),
      discount_codes: [
        { code: 'SAVE10', type: 'percent', value: 10, active: true },
        { code: 'FREESHIP', type: 'shipping', value: 0, active: true },
      ],
      shipping_rules: [
        { id: 1, threshold: 100.0, fee: 0.0, label: 'Free shipping >= $100' },
        { id: 2, threshold: 0.0, fee: 15.0, label: 'Standard shipping' },
      ],
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/shipping/quote',
        description: 'Returns shipping cost for a subtotal. Free over $100. (Reflects the > 100 boundary bug.)',
        payloadTemplate: '{\n  "subtotal": 100\n}',
        handler: (requestBody: string) => {
          try {
            const { subtotal: sub } = JSON.parse(requestBody || '{}');
            const n = Number(sub);
            // BUG ECO-02: > 100 instead of >= 100 — exactly 100 still charges $15.
            const fee = n > 100 ? 0 : 15.0;
            return { status: 200, body: { subtotal: n, shipping: fee, freeShipping: fee === 0 } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/discount/apply',
        description: 'Validates a discount code. (Reflects the case-sensitive matching bug.)',
        payloadTemplate: '{\n  "code": "save10"\n}',
        handler: (requestBody: string) => {
          try {
            const { code } = JSON.parse(requestBody || '{}');
            // BUG ECO-06: case-sensitive equality — "save10" is rejected.
            if (code === 'SAVE10') {
              return { status: 200, body: { valid: true, percentOff: 10 } };
            }
            return { status: 404, body: { valid: false, error: 'Unknown discount code' } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/cart/add',
        description: 'Adds an item to the cart. (Reflects the out-of-stock add bug.)',
        payloadTemplate: '{\n  "productId": 103,\n  "quantity": 1\n}',
        handler: (requestBody: string) => {
          try {
            const { productId, quantity } = JSON.parse(requestBody || '{}');
            const product = PRODUCTS.find(p => p.id === Number(productId));
            if (!product) return { status: 404, body: { error: 'Product not found' } };
            // BUG ECO-12: no stock check — out-of-stock items are accepted.
            return {
              status: 200,
              body: { added: true, productId: product.id, quantity: Number(quantity), stock: product.stock },
            };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      {
        bugId: 'ECO-01', title: 'Cart quantity can go negative', location: 'EcommerceApp.tsx — updateQuantity()',
        technique: 'Boundary Value',
        buggyCode: 'return { ...item, quantity: item.quantity + delta };',
        fixedCode: 'return { ...item, quantity: Math.max(0, item.quantity + delta) };',
        explanation: 'Decrementing below zero is unguarded. Clamp the lower bound to 0.',
      },
      {
        bugId: 'ECO-02', title: 'Free shipping boundary off-by-one', location: 'EcommerceApp.tsx — shipping calc',
        technique: 'Equivalence Partitioning',
        buggyCode: 'const shipping = subtotal > 100 ? 0 : 15.0;',
        fixedCode: 'const shipping = subtotal >= 100 ? 0 : 15.0;',
        explanation: 'Requirement is "$100 or more". Using > 100 charges shipping at exactly $100.',
      },
      {
        bugId: 'ECO-03', title: 'Address not validated', location: 'EcommerceApp.tsx — handleCheckout()',
        technique: 'Missing Validation',
        buggyCode: 'if (subtotal <= 0) { ... }\n// no address check',
        fixedCode: 'if (address.trim() === "") {\n  setCheckoutStatus("Error: Address is required.");\n  return;\n}',
        explanation: 'Checkout proceeds with a blank address. Validate before placing the order.',
      },
      {
        bugId: 'ECO-04', title: 'Total stale after removing item', location: 'EcommerceApp.tsx — subtotal effect',
        technique: 'Stale State',
        buggyCode: 'if (active.length < activeCount) { setActiveCount(active.length); return; }',
        fixedCode: 'const next = cart.reduce((a, i) => a + i.price * i.quantity, 0);\nsetSubtotal(next);\nsetActiveCount(active.length);',
        explanation: 'Early-return on removal skips the recompute, leaving subtotal stale. Always recompute.',
      },
      {
        bugId: 'ECO-05', title: 'Quantity exceeds available stock', location: 'EcommerceApp.tsx — updateQuantity()',
        technique: 'Boundary Value',
        buggyCode: 'quantity: item.quantity + delta',
        fixedCode: 'quantity: Math.min(item.stock, Math.max(0, item.quantity + delta))',
        explanation: 'No upper bound lets the cart hold more units than exist. Clamp to item.stock.',
      },
      {
        bugId: 'ECO-06', title: 'Discount code is case-sensitive', location: 'EcommerceApp.tsx — applyDiscount()',
        technique: 'Equivalence Partitioning',
        buggyCode: "if (discountCode === 'SAVE10') {",
        fixedCode: "if (discountCode.trim().toUpperCase() === 'SAVE10') {",
        explanation: 'Coupon codes should be case-insensitive; "save10" is wrongly rejected.',
      },
      {
        bugId: 'ECO-07', title: 'Header cart badge goes stale', location: 'EcommerceApp.tsx — badgeCount state',
        technique: 'Stale State',
        buggyCode: 'const [badgeCount, setBadgeCount] = useState(0); // only +1 on add',
        fixedCode: 'const badgeCount = cart.reduce((a, i) => a + i.quantity, 0); // derived',
        explanation: 'A separately tracked count desyncs on +/-/remove. Derive it from cart instead.',
      },
      {
        bugId: 'ECO-08', title: 'Tax shown inconsistently', location: 'EcommerceApp.tsx — list price vs cart',
        technique: 'Equivalence Partitioning',
        buggyCode: 'list: ${price.toFixed(2)}   // no tax\ncart total: subtotal + tax',
        fixedCode: 'Show price including tax in both places (or exclude tax in both consistently).',
        explanation: 'List omits tax while the cart total includes it, confusing the displayed price.',
      },
      {
        bugId: 'ECO-09', title: 'Quantity accepts decimals', location: 'EcommerceApp.tsx — setQuantityRaw()',
        technique: 'Boundary Value',
        buggyCode: 'const num = parseFloat(value);',
        fixedCode: 'const num = parseInt(value, 10);',
        explanation: 'parseFloat permits 1.5 units. Use parseInt to enforce whole quantities.',
      },
      {
        bugId: 'ECO-10', title: 'Checkout enabled on empty cart', location: 'EcommerceApp.tsx — checkout button',
        technique: 'Logic Error',
        buggyCode: '<button className="btn btn-primary" onClick={handleCheckout}>',
        fixedCode: '<button ... disabled={subtotal <= 0} onClick={handleCheckout}>',
        explanation: 'The button is always clickable; disable it when the cart is empty.',
      },
      {
        bugId: 'ECO-11', title: 'Email not validated', location: 'EcommerceApp.tsx — handleCheckout()',
        technique: 'Missing Validation',
        buggyCode: '// no email validation before placing order',
        fixedCode: 'if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {\n  setCheckoutStatus("Error: Invalid email."); return;\n}',
        explanation: 'Orders accept any email. Validate the format before checkout.',
      },
      {
        bugId: 'ECO-12', title: 'Out-of-stock item addable', location: 'EcommerceApp.tsx — addToCart()',
        technique: 'Logic Error',
        buggyCode: 'const addToCart = (id) => { updateQuantity(id, 1); };',
        fixedCode: 'const p = PRODUCTS.find(p => p.id === id);\nif (!p || p.stock <= 0) return;\nupdateQuantity(id, 1);',
        explanation: 'Items with stock 0 (Pour-over Coffee Maker) can still be added. Guard on stock.',
      },
      {
        bugId: 'ECO-13', title: 'Subtotal rounding error', location: 'EcommerceApp.tsx — subtotal effect',
        technique: 'Precision Error',
        buggyCode: 'setSubtotal(cart.reduce((a, i) => a + i.price * i.quantity, 0));',
        fixedCode: 'setSubtotal(Math.round(cart.reduce((a, i) => a + i.price * i.quantity, 0) * 100) / 100);',
        explanation: 'Float accumulation produces values like 37.489999. Round to cents.',
      },
      {
        bugId: 'ECO-14', title: 'Remove deletes wrong item', location: 'EcommerceApp.tsx — removeItem()',
        technique: 'Data Integrity',
        buggyCode: 'const firstActiveIdx = prev.findIndex(i => i.quantity !== 0);\n// removes first active, not the one clicked',
        fixedCode: 'return prev.map(item => item.id === id ? { ...item, quantity: 0 } : item);',
        explanation: 'Removal targets the first active line instead of the clicked id. Match by id.',
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

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Bean &amp; Brew Store</h1>
          <p>Purchase premium coffee equipment. (Difficulty: Medium)</p>
        </div>
        <div style={{ position: 'relative' }}>
          <ShoppingCart size={32} style={{ color: 'var(--primary)' }} />
          <span style={{
            position: 'absolute', top: '-8px', right: '-8px', background: 'var(--primary)',
            color: '#fff', borderRadius: '999px', minWidth: '20px', height: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
            fontWeight: 'bold', padding: '0 4px',
          }}>{badgeCount}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Products List */}
        <div>
          <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Products</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cart.map(product => (
              <div key={product.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>{product.name}</h3>
                  {/* BUG ECO-08: list price shown without tax */}
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>${product.price.toFixed(2)}</span>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: product.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => updateQuantity(product.id, -1)}>-</button>
                  {/* BUG ECO-09: decimal-accepting input */}
                  <input
                    className="input-field"
                    style={{ width: '60px', textAlign: 'center', padding: '0.25rem' }}
                    value={product.quantity}
                    onChange={(e) => setQuantityRaw(product.id, e.target.value)}
                  />
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => updateQuantity(product.id, 1)}>+</button>
                  <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => addToCart(product.id)}>Add</button>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem', color: 'var(--danger)' }} onClick={() => removeItem(product.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Sidebar */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={20} /> Order Summary
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--success)' }}>
              <span>Discount</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          {/* BUG ECO-08: tax applied in cart but not in list prices */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: shipping === 0 ? 'var(--success)' : 'inherit' }}>
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              className="input-field"
              style={{ flex: 1 }}
              placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={applyDiscount}>Apply</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', fontSize: '1.25rem', fontWeight: 'bold' }}>
            <span>Total</span>
            <span style={{ color: 'var(--primary)' }}>${finalTotal.toFixed(2)}</span>
          </div>

          <div className="input-group" style={{ marginTop: '2rem' }}>
            <label className="input-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">Shipping Address <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Enter your address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* BUG ECO-10: button not disabled on empty cart */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
            onClick={handleCheckout}
          >
            <CreditCard size={18} /> Complete Checkout
          </button>

          {checkoutStatus && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: checkoutStatus.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: checkoutStatus.includes('Error') ? 'var(--danger)' : 'var(--success)',
              fontWeight: 500,
            }}>
              {checkoutStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const EcommerceApp = () => (
  <QALayout>
    <EcommerceInner />
  </QALayout>
);
