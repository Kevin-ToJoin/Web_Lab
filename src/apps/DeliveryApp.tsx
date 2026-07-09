import { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Utensils, Truck, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QALayout } from '../qa/QALayout';
import { useQAPanel, type APIEndpoint, type BugSolution } from '../qa/QAContext';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

interface CartLine {
  itemId: string;
  qty: number;
}

const MENU: MenuItem[] = [
  { id: 'burger', name: 'Classic Burger', price: 9.5,  inStock: true },
  { id: 'fries',  name: 'Crispy Fries',   price: 4.0,  inStock: true },
  { id: 'salad',  name: 'Garden Salad',   price: 7.25, inStock: true },
  { id: 'wings',  name: 'Buffalo Wings',  price: 11.0, inStock: false },
];

const ALLOWED_ZONES = ['10001', '10002', '10003'];
const MIN_ORDER = 15;               // minimum food subtotal to check out
const FREE_DELIVERY_THRESHOLD = 30; // subtotal at/above this ships free
const DELIVERY_FEE = 4.99;
const TAX_RATE = 0.08;
const PROMO_CODE = 'SAVE5';         // flat $5 off
const PROMO_DISCOUNT = 5;
const OPEN_HOUR = 9;
const CLOSE_HOUR = 22;

interface Summary {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  eta: string;
}

const DeliveryInner = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [zip, setZip] = useState('');
  const [slot, setSlot] = useState('');           // datetime-local delivery slot
  const [promo, setPromo] = useState('');
  const [appliedPromos, setAppliedPromos] = useState<string[]>([]);
  const [tipPct, setTipPct] = useState('15');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [status, setStatus] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const menuItem = (id: string) => MENU.find(m => m.id === id) ?? MENU[0];

  const addToCart = (item: MenuItem) => {
    // BUG DEL-09 (L3 UI Bug): the Add button works even for out-of-stock items —
    // there is no `disabled` / in-stock guard, so a sold-out item can be added.
    void item.inStock;
    setCart(prev => {
      const existing = prev.find(l => l.itemId === item.id);
      if (existing) return prev.map(l => l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { itemId: item.id, qty: 1 }];
    });
  };

  const setQty = (itemId: string, raw: string) => {
    const qty = parseInt(raw, 10);
    // BUG DEL-06 (L3 Boundary): quantity has no upper cap and no lower floor —
    // 9999 and negative quantities are both accepted (should clamp to 1..99).
    setCart(prev => prev.map(l => l.itemId === itemId ? { ...l, qty: isNaN(qty) ? 0 : qty } : l));
  };

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (code !== PROMO_CODE) {
      setStatus(`Unknown promo code "${promo}".`);
      return;
    }
    // BUG DEL-04 (L4 Logic): the promo can be applied more than once — the same
    // code stacks because there is no "already applied" guard.
    setAppliedPromos(prev => [...prev, code]);
    setStatus(`Promo ${code} applied.`);
  };

  const foodSubtotal = () =>
    cart.reduce((sum, l) => sum + menuItem(l.itemId).price * l.qty, 0);

  const isWithinHours = () => {
    // BUG DEL-10 (L5 Timezone): operating-hours check builds a Date from a string,
    // which is parsed as UTC, so getHours() drifts by the local offset and the
    // shop appears open/closed at the wrong wall-clock time.
    const now = new Date(new Date().toISOString());
    const h = now.getHours();
    return h >= OPEN_HOUR && h < CLOSE_HOUR;
  };

  const placeOrder = () => {
    setStatus('');
    setConfirmation('');

    // BUG DEL-12 (L3 Missing Validation): an empty cart can place an order —
    // there is no `cart.length === 0` guard, so a $0 order is confirmed.
    void cart.length;

    const subtotal = foodSubtotal();

    // BUG DEL-01 (L3 Missing Validation): the delivery ZIP is never checked against
    // ALLOWED_ZONES, so an out-of-zone address checks out.
    void ALLOWED_ZONES;

    // BUG DEL-02 (L4 Boundary): the $15 minimum-order rule is not enforced —
    // orders below MIN_ORDER still check out.
    void MIN_ORDER;

    // BUG DEL-07 (L5 Date/Time): a delivery slot in the past is accepted; there is
    // no comparison of the chosen slot against "now".
    void slot;

    // BUG DEL-13 (L4 Boundary): the free-delivery threshold counts the tip toward
    // the subtotal, so a small food order ships free once a big tip is added.
    const tipPctNum = (parseInt(tipPct, 10) || 0) / 100;

    // BUG DEL-05 (L4 Logic): the tip is computed on the grand total (subtotal +
    // delivery fee + tax) instead of on the food subtotal only.
    // BUG DEL-08 (L4 Logic): tax is applied BEFORE the discount instead of after.
    const tax = subtotal * TAX_RATE; // taxed on full subtotal, pre-discount

    // BUG DEL-04 effect: every applied promo (including duplicates) is subtracted.
    const discount = appliedPromos.length * PROMO_DISCOUNT;

    // free-delivery uses subtotal + tip (DEL-13). BUG DEL-03 (L3 Boundary): uses
    // strict > so an order exactly at $30 is still charged the fee.
    const thresholdBasis = subtotal + subtotal * tipPctNum; // tip folded in (DEL-13)
    const deliveryFee = thresholdBasis > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

    const grandBeforeTip = subtotal + deliveryFee + tax - discount;

    // BUG DEL-11 (L4 Logic): the tip is not rounded to cents, so floating-point
    // drift leaks into the displayed total.
    const tip = grandBeforeTip * tipPctNum; // DEL-05: based on grand total, DEL-11: no rounding

    const total = grandBeforeTip + tip;

    // BUG DEL-14 (L5 Logic): the ETA is hardcoded to "30 min" regardless of the
    // delivery zone or distance.
    const eta = '30 min';

    void isWithinHours(); // hours check exists but result is ignored here

    setSummary({
      subtotal,
      deliveryFee,
      discount,
      tax,
      tip,
      total,
      eta,
    });
    setConfirmation(`Order confirmed! Estimated delivery: ${eta}.`);
  };

  useEffect(() => {
    setRequirements(`## QuickBite — Food Delivery

Customers build a cart, choose a delivery ZIP and time-slot, apply a promo, pick a tip, and place an order.

### Functional Requirements
- Delivery is only available to **allowed zones** (${ALLOWED_ZONES.join(', ')}); out-of-zone ZIPs are rejected.
- A **minimum order of $${MIN_ORDER}** (food subtotal) is required to check out.
- Delivery is **free at or above $${FREE_DELIVERY_THRESHOLD}** food subtotal (use \`>=\`); otherwise a $${DELIVERY_FEE} fee applies. The **tip does not count** toward this threshold.
- A **promo code** may be applied **only once** ($${PROMO_DISCOUNT} off for ${PROMO_CODE}).
- The **tip** is a percentage of the **food subtotal only**, rounded to cents.
- **Tax** (${(TAX_RATE * 100).toFixed(0)}%) is charged on the subtotal **after** the discount.
- Item **quantity** must be between **1 and 99** — no negatives, no 9999.
- The delivery **time-slot must be in the future**.
- **Out-of-stock** items cannot be added to the cart.
- The **cart must not be empty** to place an order.
- Operating-hours and ETA must be correct (no timezone drift, ETA reflects the zone).

### Levels
14 bugs, difficulty levels 3-5 (missing validation, boundary value, logic, date/time, timezone, UI).`);

    setDbTables({
      Menu: MENU.map((m, i) => ({ id: i + 1, code: m.id, name: m.name, price: m.price, inStock: m.inStock })),
      Orders: [
        { id: 9001, zip: '10001', subtotal: 24.5, tip: 3.68, total: 31.65, status: 'delivered' },
        { id: 9002, zip: '10003', subtotal: 12.0, tip: 1.8,  total: 18.75, status: 'in-transit' },
      ],
      DeliveryZones: ALLOWED_ZONES.map((z, i) => ({ id: i + 1, zip: z, active: true })),
    });

    const endpoints: APIEndpoint[] = [
      {
        method: 'POST',
        path: '/api/checkout',
        description: 'Places an order. (Reflects DEL-02: no minimum-order check, and DEL-01: no zone check.)',
        payloadTemplate: '{\n  "zip": "99999",\n  "subtotal": 8.00\n}',
        handler: (requestBody: string) => {
          try {
            const { zip: z, subtotal: sub } = JSON.parse(requestBody || '{}');
            // BUG DEL-01: zone never validated. BUG DEL-02: minimum never enforced.
            return { status: 200, body: { confirmed: true, zip: z, subtotal: sub, eta: '30 min' } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
      {
        method: 'POST',
        path: '/api/quote',
        description: 'Prices an order. (Reflects DEL-03: free-delivery uses > not >=, and DEL-08: tax before discount.)',
        payloadTemplate: '{\n  "subtotal": 30,\n  "discount": 5\n}',
        handler: (requestBody: string) => {
          try {
            const { subtotal: sub, discount: disc } = JSON.parse(requestBody || '{}');
            // BUG DEL-03: strict > means exactly 30 is still charged the fee.
            const fee = sub > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
            // BUG DEL-08: tax on subtotal before discount.
            const tax = Math.round(sub * TAX_RATE * 100) / 100;
            const total = sub + fee + tax - (disc || 0);
            return { status: 200, body: { deliveryFee: fee, tax, total } };
          } catch {
            return { status: 400, body: { error: 'Invalid JSON body' } };
          }
        },
      },
    ];
    setApiEndpoints(endpoints);

    const solutions: BugSolution[] = [
      { bugId: 'DEL-01', title: 'Out-of-zone ZIP accepted', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Missing Validation',
        buggyCode: 'void ALLOWED_ZONES; // never checked',
        fixedCode: 'if (!ALLOWED_ZONES.includes(zip)) { setStatus("We do not deliver to that ZIP."); return; }',
        explanation: 'The delivery ZIP is never validated against the serviceable zones, so an out-of-zone address checks out.' },
      { bugId: 'DEL-02', title: 'Minimum order not enforced', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Boundary Value',
        buggyCode: 'void MIN_ORDER; // never checked',
        fixedCode: 'if (subtotal < MIN_ORDER) { setStatus(`$${MIN_ORDER} minimum order.`); return; }',
        explanation: 'Orders below the $15 food-subtotal minimum still check out. Reject subtotals under the minimum.' },
      { bugId: 'DEL-03', title: 'Free-delivery threshold off-by-one', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Boundary Value',
        buggyCode: 'const fee = basis > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;',
        fixedCode: 'const fee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;',
        explanation: 'A $30 order (exactly at the threshold) is still charged the fee because the check uses strict >. Use >=.' },
      { bugId: 'DEL-04', title: 'Promo code stacks / applies twice', location: 'DeliveryApp.tsx — applyPromo()', technique: 'Logic Error',
        buggyCode: 'setAppliedPromos(prev => [...prev, code]); // no dedupe',
        fixedCode: 'if (appliedPromos.includes(code)) { setStatus("Promo already applied."); return; }',
        explanation: 'The same promo can be applied repeatedly, adding the discount each time. Guard against re-applying a code.' },
      { bugId: 'DEL-05', title: 'Tip computed on grand total', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Logic Error',
        buggyCode: 'const tip = grandBeforeTip * tipPctNum; // incl. fee + tax',
        fixedCode: 'const tip = subtotal * tipPctNum; // food subtotal only',
        explanation: 'The tip percentage is taken on subtotal + delivery fee + tax. It should be based on the food subtotal only.' },
      { bugId: 'DEL-06', title: 'Quantity has no cap or floor', location: 'DeliveryApp.tsx — setQty()', technique: 'Boundary Value',
        buggyCode: 'setCart(... qty: isNaN(qty) ? 0 : qty);',
        fixedCode: 'const clamped = Math.max(1, Math.min(99, qty || 1));',
        explanation: 'A quantity of 9999 or a negative value is accepted. Clamp quantity to the 1..99 range.' },
      { bugId: 'DEL-07', title: 'Past delivery slot accepted', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Date/Time',
        buggyCode: 'void slot; // slot never compared to now',
        fixedCode: 'if (new Date(slot) <= new Date()) { setStatus("Choose a future slot."); return; }',
        explanation: 'A delivery time-slot in the past is accepted. Reject slots that are not in the future.' },
      { bugId: 'DEL-08', title: 'Tax applied before discount', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Logic Error',
        buggyCode: 'const tax = subtotal * TAX_RATE; // pre-discount',
        fixedCode: 'const tax = (subtotal - discount) * TAX_RATE; // post-discount',
        explanation: 'Tax is charged on the full subtotal before the promo discount. Tax should apply to the discounted amount.' },
      { bugId: 'DEL-09', title: 'Add works for out-of-stock item', location: 'DeliveryApp.tsx — addToCart()', technique: 'UI Bug',
        buggyCode: 'void item.inStock; // add anyway',
        fixedCode: 'if (!item.inStock) return; // and disable the button',
        explanation: 'The Add button adds a sold-out item to the cart. Guard the handler and disable the button when out of stock.' },
      { bugId: 'DEL-10', title: 'Operating-hours drift by timezone', location: 'DeliveryApp.tsx — isWithinHours()', technique: 'Timezone Error',
        buggyCode: 'const now = new Date(new Date().toISOString()); now.getHours();',
        fixedCode: 'const h = new Date().getHours(); // local wall-clock',
        explanation: 'Round-tripping through an ISO string reintroduces UTC parsing, so getHours() drifts by the local offset.' },
      { bugId: 'DEL-11', title: 'Tip not rounded to cents', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Logic Error',
        buggyCode: 'const tip = grandBeforeTip * tipPctNum; // raw float',
        fixedCode: 'const tip = Math.round(subtotal * tipPctNum * 100) / 100;',
        explanation: 'The tip is a raw float, so floating-point drift leaks into the displayed total. Round to cents.' },
      { bugId: 'DEL-12', title: 'Empty cart can place an order', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Missing Validation',
        buggyCode: 'void cart.length; // no empty-cart guard',
        fixedCode: 'if (cart.length === 0) { setStatus("Your cart is empty."); return; }',
        explanation: 'An empty cart produces a $0 confirmed order. Require at least one item to place an order.' },
      { bugId: 'DEL-13', title: 'Tip counts toward free-delivery', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Boundary Value',
        buggyCode: 'const thresholdBasis = subtotal + subtotal * tipPctNum;',
        fixedCode: 'const thresholdBasis = subtotal; // tip excluded',
        explanation: 'A large tip pushes a small food order past the free-delivery threshold. The threshold should use the food subtotal only.' },
      { bugId: 'DEL-14', title: 'ETA is always 30 min', location: 'DeliveryApp.tsx — placeOrder()', technique: 'Logic Error',
        buggyCode: "const eta = '30 min'; // hardcoded",
        fixedCode: 'const eta = etaForZone(zip); // varies by distance/zone',
        explanation: 'The estimated delivery time is hardcoded regardless of distance or zone. Compute the ETA from the destination.' },
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
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>QuickBite</h1>
        <p>Food-delivery ordering: build a cart, price it, and check out. (Difficulty: Medium)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Menu */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Utensils size={20} /> Menu
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {MENU.map(item => (
              <div key={item.id} className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div>{item.name}</div>
                  <div style={{ color: item.inStock ? 'var(--text-muted)' : 'var(--danger, #e66)', fontSize: '0.85rem' }}>
                    ${item.price.toFixed(2)}{item.inStock ? '' : ' — Out of stock'}
                  </div>
                </div>
                {/* BUG DEL-09: no `disabled` for out-of-stock items. */}
                <button
                  className="btn btn-primary"
                  data-testid={`add-${item.id}`}
                  onClick={() => addToCart(item)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cart & checkout */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={20} /> Your Cart
          </h2>

          {cart.length === 0 && <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Cart is empty.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {cart.map(line => (
              <div key={line.itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span>{menuItem(line.itemId).name}</span>
                <input
                  type="number"
                  className="input-field"
                  aria-label={`Quantity ${menuItem(line.itemId).name}`}
                  data-testid={`qty-${line.itemId}`}
                  style={{ width: '5rem' }}
                  value={line.qty}
                  onChange={e => setQty(line.itemId, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="zip">Delivery ZIP</label>
            <input id="zip" className="input-field" value={zip} onChange={e => setZip(e.target.value)} placeholder="10001" />
          </div>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="slot">Delivery time-slot</label>
            <input id="slot" type="datetime-local" className="input-field" value={slot} onChange={e => setSlot(e.target.value)} />
          </div>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="promo">Promo code</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input id="promo" className="input-field" value={promo} onChange={e => setPromo(e.target.value)} placeholder={PROMO_CODE} />
              <button className="btn btn-secondary" onClick={applyPromo}><Tag size={16} /> Apply</button>
            </div>
          </div>

          <div className="input-group" style={inputStyle}>
            <label className="input-label" htmlFor="tip">Tip</label>
            <select id="tip" className="input-field" value={tipPct} onChange={e => setTipPct(e.target.value)}>
              <option value="0">No tip</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
              <option value="20">20%</option>
            </select>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} data-testid="place-order" onClick={placeOrder}>
            <Truck size={18} /> Place Order
          </button>

          {status && <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{status}</p>}

          {summary && (
            <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Subtotal</span><span data-testid="sum-subtotal">${summary.subtotal.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Delivery fee</span><span data-testid="sum-delivery">${summary.deliveryFee.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--success)' }}><span>Discount</span><span data-testid="sum-discount">-${summary.discount.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Tax</span><span data-testid="sum-tax">${summary.tax.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}><span>Tip</span><span data-testid="sum-tip">${summary.tip.toFixed(2)}</span></div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.6rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}><span>Total</span><span data-testid="order-total">${summary.total.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', color: 'var(--text-muted)' }}><span>ETA</span><span data-testid="order-eta">{summary.eta}</span></div>
            </div>
          )}

          {confirmation && <p data-testid="confirmation" style={{ marginTop: '1rem', color: 'var(--success)' }}>{confirmation}</p>}
        </div>
      </div>
    </div>
  );
};

export const DeliveryApp = () => (
  <QALayout>
    <DeliveryInner />
  </QALayout>
);
