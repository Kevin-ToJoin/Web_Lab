import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';

export const OrderHistory = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { orders } = useCart();

  useEffect(() => {
    setRequirements(`## Order History
### Acceptance Criteria:
- Must list every order the customer has placed, most recent first.
- Dates must be shown in a human-readable, localized format.
- Each order must show its status (Processing/Delivered) with a visual distinction.
- Clicking an order should let the customer see its line items.
- Empty history must show a friendly message, not a blank page.

### Bug Hints (8 bugs on this page):
- 🐛 **Level 2:** Are the order dates readable, or do they look like raw timestamps?
- 🐛 **Level 3:** Are orders sorted with the most recent first, or in whatever order they happen to be stored?
- 🐛 **Level 2:** Click on an order row. Does anything happen?
- 🐛 **Level 2 (Accessibility):** Is "Processing" vs "Delivered" distinguished by anything other than color alone?
- 🐛 **Level 1:** Is there any way to reach this page from the Storefront or header?
- 🐛 **Level 3 (Boundary):** Look at an order's total — does it match subtotal + tax + shipping - discount for its items, or could it drift?
- 🐛 **Level 1:** Is there any summary of total orders placed or total amount spent?
- 🐛 **Level 1:** Clear your order history (DevTools > Application > Local Storage) and reload. Is there any way to get back to shopping from the empty state?`);

    setDbTables({ Orders: orders });
    setApiEndpoints([
      { method: 'GET', path: '/api/orders', description: 'Returns all past orders for the customer.', handler: () => ({ status: 200, body: orders }) },
    ]);

    setRemoteSolutions({ app: 'ecommerce', bugIds: ['ECO-33', 'ECO-34', 'ECO-35', 'ECO-36', 'ECO-37', 'ECO-38', 'ECO-61', 'ECO-62'] });
  }, [orders, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/ecommerce')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Store
      </button>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Order History</h1>

      {orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No orders yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map(order => (
            <div key={order.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{order.id}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{order.date}</div>
              </div>
              <span style={{ color: order.status === 'Delivered' ? 'var(--success)' : 'var(--text-muted)' }}>{order.status}</span>
              <span style={{ fontWeight: 'bold' }}>${order.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
