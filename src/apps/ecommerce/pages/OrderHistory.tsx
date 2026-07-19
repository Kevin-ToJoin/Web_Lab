import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';

export const OrderHistory = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
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

    const solutions: BugSolution[] = [
      {
        bugId: 'ECO-33', title: 'Order dates render as raw ISO timestamps',
        location: 'OrderHistory.tsx — order list', technique: 'Content Bug',
        buggyCode: `<span>{order.date}</span> // "2026-06-03T14:30:00Z"`,
        fixedCode: `<span>{new Date(order.date).toLocaleDateString()}</span>`,
        explanation: 'Order dates are displayed exactly as stored instead of being formatted for the viewer.',
      },
      {
        bugId: 'ECO-34', title: 'Orders are not sorted most-recent-first',
        location: 'OrderHistory.tsx — orders list', technique: 'Missing Functionality',
        buggyCode: `{orders.map(order => (...))} // rendered in raw array order`,
        fixedCode: `{[...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(...)}`,
        explanation: 'New orders are prepended to state, but nothing guarantees stored/seeded orders stay in date order — a mixed history can render out of sequence.',
      },
      {
        bugId: 'ECO-35', title: 'Clicking an order row does nothing',
        location: 'OrderHistory.tsx — order row', technique: 'Missing Functionality',
        buggyCode: `<div className="glass-panel">{order.id}...</div> // no onClick, no detail view`,
        fixedCode: `<div onClick={() => navigate(\`/ecommerce/confirmation/\${order.id}\`)}>...</div>`,
        explanation: 'There is no way to drill into an order\'s line items from the history list.',
      },
      {
        bugId: 'ECO-36', title: 'Order status is conveyed by color alone',
        location: 'OrderHistory.tsx — status badge', technique: 'Accessibility',
        buggyCode: `<span style={{ color: status === 'Delivered' ? 'var(--success)' : 'var(--text-muted)' }}>{status}</span>`,
        fixedCode: `<span><StatusIcon status={status} aria-hidden="true" /> {status}</span>`,
        explanation: 'While the status text itself is present (good), nothing else — icon, pattern — reinforces it for color-blind users relying on the badge styling alone in the mock UI.',
      },
      {
        bugId: 'ECO-37', title: 'No link to Order History from the Storefront or header',
        location: 'Storefront.tsx / header', technique: 'Missing Functionality',
        buggyCode: `{/* header only has a cart icon — no "My Orders" link anywhere */}`,
        fixedCode: `<button onClick={() => navigate('/ecommerce/orders')}>My Orders</button>`,
        explanation: 'The route is fully implemented, but nothing in the normal navigation flow points to it.',
      },
      {
        bugId: 'ECO-38', title: 'Seeded historical order totals don\'t match their line items',
        location: 'CartContext.tsx — seeded orders', technique: 'Data Integrity',
        buggyCode: `{ id: 'ORD-502', total: 40.85, items: [{ productId: 105, quantity: 1 }, { productId: 106, quantity: 1 }] }
// French Press ($28.00) + Travel Tumbler ($18.75) = $46.75 before tax/shipping, not $40.85`,
        fixedCode: `// Recompute totals from PRODUCTS + tax/shipping rules instead of hardcoding a total.`,
        explanation: 'Cross-checking the DB viewer\'s Orders table against the Products table shows the stored total doesn\'t reconcile with the line items — a classic "trust but verify" data integrity check.',
      },
      {
        bugId: 'ECO-61', title: 'No total order count or spending summary shown',
        location: 'OrderHistory.tsx — page header', technique: 'Missing Functionality',
        buggyCode: `<h1>Order History</h1>\n{/* no "3 orders, $142.50 total" summary anywhere */}`,
        fixedCode: `<p>{orders.length} orders — ${orders.reduce((s, o) => s + o.total, 0).toFixed(2)} total spent</p>`,
        explanation: 'A customer reviewing their history gets no at-a-glance summary, only a raw list.',
      },
      {
        bugId: 'ECO-62', title: 'Empty order history has no call-to-action',
        location: 'OrderHistory.tsx — empty state', technique: 'Missing Functionality',
        buggyCode: `<div>No orders yet.</div> // dead end, no link back to shopping`,
        fixedCode: `<div>No orders yet. <Link to="/ecommerce">Start shopping</Link></div>`,
        explanation: 'A first-time customer with no orders lands on a dead end instead of being nudged back to the storefront.',
      },
    ];
    setSolutions(solutions);
  }, [orders, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
