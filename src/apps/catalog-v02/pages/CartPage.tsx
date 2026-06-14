import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useQAPanel } from '../context/QAPanelContext';
import { ArrowLeft, Trash2, Tag, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CartPage = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, totalItems, subtotal, discount, tax, total, applyPromo } = useCart();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const [promoCode, setPromoCode] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState('');

  useEffect(() => {
    setRequirements(`## Shopping Cart
### Acceptance Criteria:
- Quantity can only be **1 or more** — zero and negative values must be rejected.
- Removing an item must remove **only that specific item**, regardless of its ID or position.
- \`Total Items\` counter must update immediately after every add, update, or remove action.
- Tax (8%) must be calculated on the **post-discount** subtotal, not the pre-discount subtotal.
- Promo code \`SAVE20\` applies 20% off. Any code not in the approved list must be rejected.
- The displayed Total must be mathematically exact: \`(Subtotal × 1.08) - Discount\`.
- Checkout must fail gracefully if floating-point precision causes the total to drift.

### Bug Hints (7 bugs in this area):
- 🐛 **Level 3 (Boundary):** Click the **−** button when quantity is 1. Can the quantity go to 0 or negative? What happens to the cart total?
- 🐛 **Level 5 (Stale State):** Add a product, then **remove** it. Does the "Total Items" counter update correctly?
- 🐛 **Level 7 (Data Integrity):** Add **PROD-001** (Ultra HD 4K Smart TV) to the cart, then add another product, then try to remove PROD-001. Which item actually disappears?
- 🐛 **Level 8 (Regex):** The valid promo codes are \`SAVE20\` and \`FALL10\`. Try entering a fake code that ends in "20" (e.g., \`HACK20\`, \`AAA20\`). Does it get accepted?
- 🐛 **Level 8 (Logic):** Apply a promo code and check the order summary. Is the 8% tax applied on the **discounted** amount or the **full** subtotal? Check the DB for the expected formula.
- 🐛 **Level 9 (Security):** Open your browser console and run \`localStorage.setItem('isAdmin', 'true')\`, then refresh the cart. What happens to the total?
- 🐛 **Level 10 (Float):** Add items whose prices have cents (e.g., $249.50). After tax calculations, try clicking Checkout. Does the payment validation pass every time?

### Expected Formula:
\`\`\`
Subtotal = sum(price × qty)
Discount = Subtotal × promo_rate   ← if promo applied
Tax      = (Subtotal - Discount) × 0.08   ← must apply AFTER discount
Total    = Subtotal - Discount + Tax
\`\`\``);

    setDbTables({
      'Cart_State': items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.quantity, lineTotal: i.price * i.quantity })),
      'Promo_Codes_DB': [
        { code: 'SAVE20', discount_rate: 0.20, status: 'ACTIVE' },
        { code: 'FALL10', discount_rate: 0.10, status: 'ACTIVE' }
      ],
      'Cart_Totals_Expected': [{
        subtotal: subtotal.toFixed(4),
        note_tax: 'Tax = (subtotal - discount) × 0.08',
        note_actual: 'Tax = subtotal × 0.08  ← BUG if promo applied'
      }]
    });

    setApiEndpoints([
      { method: 'POST', path: '/api/v1/checkout/validate', description: 'Strict float-equality check. Fails if total has any floating-point drift beyond 2 decimal places.', payloadTemplate: `{\n  "total": ${total}\n}` },
      { method: 'POST', path: '/api/v1/promos/apply', description: 'Validates promo code against approved list. Only SAVE20 and FALL10 are valid.', payloadTemplate: `{\n  "code": "${promoCode}"\n}` },
      { method: 'DELETE', path: '/api/v1/cart/{itemId}', description: 'Removes a specific item from the cart by its product ID.' }
    ]);
  }, [items, total, promoCode, setRequirements, setDbTables, setApiEndpoints]);

  const handleCheckout = () => {
    // Level 10 BUG: Float precision strict equality.
    // A simulated backend check that expects exact precision.
    // If the total internally is 120.0000000001 due to float math, this check fails unpredictably!
    
    // We'll simulate a failure if the total is not an exact integer when multiplied by 100
    const floatDrift = (total * 100) % 1;
    if (floatDrift !== 0) {
      setCheckoutStatus(`CRITICAL PAYMENT ERROR: Amount mismatch. Expected ${total.toFixed(2)} but received ${total}.`);
      return;
    }

      setCheckoutStatus('Order Validation Passed! Redirecting to Shipping...');
      setTimeout(() => navigate('/catalog/checkout/shipping'), 1000);
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/catalog')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Continue Shopping
      </button>

      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Your Cart</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Your cart is empty.
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="glass-panel" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
                <img src={item.images[0]} alt={item.name} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>{item.name}</h3>
                    <div style={{ fontWeight: 'bold' }}>${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                  
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>${item.price.toFixed(2)} each</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button type="button" aria-label={`Decrease quantity of ${item.name}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                      <span aria-live="polite" aria-label={`Quantity: ${item.quantity}`} style={{ minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button type="button" aria-label={`Increase quantity of ${item.name}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>

                    <button type="button" aria-label={`Remove ${item.name} from cart`} className="btn btn-secondary" style={{ color: 'var(--danger)', padding: '0.5rem' }} onClick={() => removeFromCart(item.id)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order Summary */}
        <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Order Summary</h2>
          
          {/* Level 5 BUG: Stale Total Items */}
          {/* This relies on Context.totalItems which intentionally falls out of sync */}
          <div style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Total Items: {totalItems}
          </div>

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

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span>Total</span>
            <span style={{ color: 'var(--primary)' }}>${total.toFixed(2)}</span>
          </div>

          <div className="input-group" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Promo code..." 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" aria-label="Apply promo code" className="btn btn-secondary" onClick={() => applyPromo(promoCode)}>
                <Tag size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', fontSize: '1.1rem' }}
            onClick={handleCheckout}
          >
            <CreditCard size={18} /> Checkout
          </button>

          {checkoutStatus && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              borderRadius: 'var(--radius-md)', 
              background: checkoutStatus.includes('ERROR') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: checkoutStatus.includes('ERROR') ? 'var(--danger)' : 'var(--success)',
              fontSize: '0.875rem'
            }}>
              {checkoutStatus}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
