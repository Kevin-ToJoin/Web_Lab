import { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Trash2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRODUCTS = [
  { id: 101, name: "Premium Coffee Beans", price: 24.99 },
  { id: 102, name: "Ceramic Mug", price: 12.50 },
  { id: 103, name: "Pour-over Coffee Maker", price: 35.00 },
  { id: 104, name: "Electric Grinder", price: 75.00 }
];

export const EcommerceApp = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(PRODUCTS.map(p => ({ ...p, quantity: 0 })));
  const [address, setAddress] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState('');

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        // BUG LEVEL 3 (Boundary Value): No check for negative numbers!
        // A correct implementation would be Math.max(0, item.quantity + delta)
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    }));
  };

  const removeItem = (id: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: 0 } : item));
    // BUG LEVEL 5 (State Sync): We are not updating the staleTotal here, so it remains out of sync
    // until another quantity change happens, because staleTotal is calculated in a weird way.
  };


  // Re-implementing Bug Level 5:
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    // This effect runs, but we simulate a bug where if an item is REMOVED to 0, it doesn't recalculate properly.
    const activeItems = cart.filter(i => i.quantity !== 0);
    if (activeItems.length < itemCount) {
      // Bug: If an item was fully removed, skip recalculation (simulating a stale cache)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItemCount(activeItems.length);
      return; 
    }
    
    setCalculatedTotal(cart.reduce((acc, item) => acc + item.price * item.quantity, 0));
    setItemCount(activeItems.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);


  // BUG LEVEL 4 (Equivalence): Free shipping at $100.
  // The requirement says "Free shipping on orders $100 or more".
  // The bug: it uses > 100 instead of >= 100. So exactly $100 still pays shipping!
  const shipping = calculatedTotal > 100 ? 0 : 15.00;
  const finalTotal = calculatedTotal + shipping;

  const handleCheckout = () => {
    // BUG LEVEL 4 (Validation): Missing mandatory field check for Address.
    // It should check if address.trim() === '' but it doesn't.
    
    if (calculatedTotal <= 0) {
      setCheckoutStatus('Error: Cart is empty.');
      return;
    }

    setCheckoutStatus('Success! Order placed successfully. (Simulated)');
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Bean & Brew Store</h1>
        <p>Purchase premium coffee equipment. (Difficulty: Medium)</p>
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
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>${product.price.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => updateQuantity(product.id, -1)}>-</button>
                  <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{product.quantity}</span>
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => updateQuantity(product.id, 1)}>+</button>
                  
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
            <span>${calculatedTotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: shipping === 0 ? 'var(--success)' : 'inherit' }}>
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', fontSize: '1.25rem', fontWeight: 'bold' }}>
            <span>Total</span>
            <span style={{ color: 'var(--primary)' }}>${finalTotal.toFixed(2)}</span>
          </div>

          <div className="input-group" style={{ marginTop: '2rem' }}>
            <label className="input-label">Shipping Address <span style={{color: 'var(--danger)'}}>*</span></label>
            <textarea 
              className="input-field" 
              rows={3} 
              placeholder="Enter your address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

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
              fontWeight: 500
            }}>
              {checkoutStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
