import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';

export const OrderConfirmation = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
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

    const solutions: BugSolution[] = [
      {
        bugId: 'ECO-15', title: 'Order ID is not guaranteed unique',
        location: 'CartContext.tsx — placeOrder()', technique: 'Data Integrity',
        buggyCode: `id: \`ORD-\${Math.floor(Math.random() * 900 + 100)}\` // only 900 possible values`,
        fixedCode: `id: \`ORD-\${crypto.randomUUID()}\``,
        explanation: 'A 3-digit random suffix has only 900 possible values — placing a handful of test orders makes a collision realistic.',
      },
      {
        bugId: 'ECO-16', title: 'Cart is not cleared after a successful order',
        location: 'CartContext.tsx — placeOrder()', technique: 'Stale State',
        buggyCode: `setOrders(prev => [order, ...prev]);\nreturn order; // cart state is never reset`,
        fixedCode: `setCart(PRODUCTS.map(p => ({ id: p.id, quantity: 0 })));`,
        explanation: 'After checkout succeeds, the cart items and badge count are left completely untouched.',
      },
      {
        bugId: 'ECO-31', title: 'No order summary (items) shown on confirmation',
        location: 'OrderConfirmation.tsx — page body', technique: 'Missing Functionality',
        buggyCode: `<h1>Order Confirmed!</h1>\n<p>Order ID: {order.id}</p>\n{/* no line items listed */}`,
        fixedCode: `{order.items.map(i => <OrderLineItem key={i.productId} {...i} />)}`,
        explanation: 'The customer has no way to verify what they actually bought from this page alone.',
      },
      {
        bugId: 'ECO-32', title: 'Success message has no aria-live announcement',
        location: 'OrderConfirmation.tsx — success heading', technique: 'Accessibility',
        buggyCode: `<h1>Order Confirmed!</h1> {/* no aria-live, no focus() on mount */}`,
        fixedCode: `<h1 tabIndex={-1} ref={headingRef} aria-live="polite">Order Confirmed!</h1>`,
        explanation: 'A screen-reader user gets no announcement that the order succeeded.',
      },
      {
        bugId: 'ECO-58', title: 'No estimated delivery date or next-steps info',
        location: 'OrderConfirmation.tsx — page body', technique: 'Content Bug',
        buggyCode: `<p>Order ID: {order.id}</p>\n<button onClick={() => navigate('/ecommerce')}>Return to Store</button>\n{/* nothing about when it arrives */}`,
        fixedCode: `<p>Estimated delivery: 3–5 business days. A confirmation email has been sent.</p>`,
        explanation: 'The confirmation ends abruptly with no indication of what the customer should expect next.',
      },
      {
        bugId: 'ECO-59', title: 'No link from confirmation to Order History',
        location: 'OrderConfirmation.tsx — page body', technique: 'Missing Functionality',
        buggyCode: `<button onClick={() => navigate('/ecommerce')}>Return to Store</button>
{/* no way to jump straight to Order History to find this order again */}`,
        fixedCode: `<button onClick={() => navigate('/ecommerce/orders')}>View Order History</button>`,
        explanation: 'A customer who wants to double-check their order later has to know the Order History route exists on their own.',
      },
      {
        bugId: 'ECO-60', title: 'Refreshing gives no indication the order was already placed',
        location: 'OrderConfirmation.tsx — page mount behavior', technique: 'Idempotency',
        buggyCode: `// re-renders identically on every reload, keyed only off the orderId
// route param — no "already viewed/placed" state or warning.`,
        fixedCode: `// Track a placed-order flag and warn instead of silently re-displaying
// as if nothing happened on every refresh.`,
        explanation: 'Nothing on this page distinguishes "just placed" from "revisited later," which would be risky if a real checkout action were tied to this render.',
      },
    ];
    setSolutions(solutions);
  }, [order, orderId, cart, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

  if (!order) return <div className="container">Order not found.</div>;

  return (
    <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Order Confirmed!</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '2rem' }}>Order ID: <strong>{order.id}</strong></p>
      <button className="btn btn-primary" onClick={() => navigate('/ecommerce')}>Return to Store</button>
    </div>
  );
};
