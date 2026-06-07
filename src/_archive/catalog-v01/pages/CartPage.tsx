import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ArrowLeft, Trash2, Tag, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CartPage = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, totalItems, subtotal, discount, tax, total, applyPromo } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState('');

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

    setCheckoutStatus('Order Placed Successfully! (Simulated)');
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
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                      <span style={{ minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    
                    <button className="btn btn-secondary" style={{ color: 'var(--danger)', padding: '0.5rem' }} onClick={() => removeFromCart(item.id)}>
                      <Trash2 size={16} />
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
              <button className="btn btn-secondary" onClick={() => applyPromo(promoCode)}>
                <Tag size={18} />
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
