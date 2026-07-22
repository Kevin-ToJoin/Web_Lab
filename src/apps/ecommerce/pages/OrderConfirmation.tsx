import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQAPanel } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';

export const OrderConfirmation = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { orders, cart } = useCart();

  const order = orders.find(o => o.id === orderId);

  useEffect(() => {
    setRequirements(`## Order Confirmation
### Acceptance Criteria:
- Must show a unique order ID that cannot collide with another order.
- The cart must be completely emptied after a successful order.
- The order total must match what was actually charged.
- Must show the items purchased, not just a generic success message.
- Success must be announced to assistive technology.

### Bug Hints (7 bugs on this page):
- 🐛 **Level 7 (Data Integrity):** Place two orders back-to-back quickly. Compare their order IDs — could they ever collide?
- 🐛 **Level 5 (Stale State):** After reaching this page, go back to the Storefront. Is your cart still full?
- 🐛 **Level 2:** Does this page list which items you bought?
- 🐛 **Level 3 (Accessibility):** Is the success message announced to a screen reader?
- 🐛 **Level 1:** Is there any estimated delivery date or "what happens next" info?
- 🐛 **Level 2:** Is there a link from here to Order History to find this order again later?
- 🐛 **Level 6:** Refresh this page (F5). Is there any indication the order was already placed?`);

    setDbTables({ Order: order ? [order] : [], Cart_After_Order: cart.filter(c => c.quantity > 0) });
    setApiEndpoints([
      { method: 'GET', path: `/api/orders/${orderId}`, description: 'Fetch the placed order.', handler: () => order ? { status: 200, body: order } : { status: 404, body: { error: 'Order not found' } } },
    ]);

    setRemoteSolutions({ app: 'ecommerce', bugIds: ['ECO-15', 'ECO-16', 'ECO-31', 'ECO-32', 'ECO-58', 'ECO-59', 'ECO-60'] });
  }, [order, orderId, cart, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  if (!order) return <div className="container">Order not found.</div>;

  return (
    <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Order Confirmed!</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '2rem' }}>Order ID: <strong>{order.id}</strong></p>
      <button className="btn btn-primary" onClick={() => navigate('/ecommerce')}>Return to Store</button>
    </div>
  );
};
