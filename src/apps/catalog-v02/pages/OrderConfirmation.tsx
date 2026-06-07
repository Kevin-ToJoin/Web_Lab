import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';

export const OrderConfirmation = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints } = useQAPanel();

  useEffect(() => {
    setRequirements(`## Order Confirmation
### Acceptance Criteria:
- Must display a **unique, randomly generated** Order ID (not hardcoded).
- The Order ID must appear in the \`Orders_Table\` with the correct total and status.
- The cart must be **completely emptied** after a successful order.
- A "Return to Catalog" button must navigate back to the home page.
- The displayed order total must match the actual cart total at time of checkout.

### Bug Hints (3 bugs on this page):
- 🐛 **Level 5 (Stale State):** After reaching this page, press the browser Back button and go to your cart. Is the cart empty?
- 🐛 **Level 7 (Data Integrity):** Look at the \`Orders_Table\` below. Is the \`total\` field correct? Did the order save the actual purchase amount?
- 🐛 **Level 7 (Data Integrity):** The Order ID shown is \`ORD-9999\`. Place another order — is a new unique ID generated, or is it always the same?`);

    setDbTables({
      'Orders_Table': [
        {
          id: 'ORD-9999',         // Bug: always hardcoded, never unique
          status: 'Processing',
          total: 0,               // Bug: total was never passed/saved from cart
          created_at: new Date().toISOString(),
          items: '[]'             // Bug: cart items not persisted
        }
      ],
      'Expected_Behavior': [
        { field: 'id', expected: 'Unique ID per order (e.g. ORD-7823)', actual: 'Always ORD-9999' },
        { field: 'total', expected: 'Cart total at time of purchase', actual: '0' },
        { field: 'cart_after_order', expected: 'Empty', actual: 'Cart unchanged' }
      ]
    });

    setApiEndpoints([
      { method: 'GET', path: '/api/v1/orders/ORD-9999', description: 'Fetch the order receipt. In a real system the ID would be dynamic. Notice the total field returned.' },
      { method: 'DELETE', path: '/api/v1/cart', description: 'Should be called to clear the cart after a successful order. Is it being called?' }
    ]);
  }, [setRequirements, setDbTables, setApiEndpoints]);

  return (
    <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'inline-block', padding: '2rem', borderRadius: '50%', marginBottom: '2rem' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Order Confirmed!</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '2rem' }}>Your simulated order ID is: <strong>ORD-9999</strong></p>
      
      <button className="btn btn-primary" onClick={() => navigate('/catalog')}>
        Return to Catalog
      </button>
    </div>
  );
};
