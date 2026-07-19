import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';

export const OrderConfirmation = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  useEffect(() => {
    setRequirements(`## Order Confirmation
### Acceptance Criteria:
- Must display a **unique, randomly generated** Order ID (not hardcoded).
- The Order ID must appear in the \`Orders_Table\` with the correct total and status.
- The cart must be **completely emptied** after a successful order.
- A "Return to Catalog" button must navigate back to the home page.
- The displayed order total must match the actual cart total at time of checkout.

### Bug Hints (7 bugs on this page):
- 🐛 **Level 5 (Stale State):** After reaching this page, press the browser Back button and go to your cart. Is the cart empty?
- 🐛 **Level 7 (Data Integrity):** Look at the \`Orders_Table\` below. Is the \`total\` field correct? Did the order save the actual purchase amount?
- 🐛 **Level 7 (Data Integrity):** The Order ID shown is \`ORD-9999\`. Place another order — is a new unique ID generated, or is it always the same?
- 🐛 **Level 3 (Accessibility):** Reach this page with a screen reader active — is the success message announced?
- 🐛 **Level 2:** Does this page tell you which items you actually bought, or where they're shipping to?
- 🐛 **Level 1:** Is there any estimated delivery date or "what happens next" information?
- 🐛 **Level 6:** After reaching this page, refresh it (F5). Is there anything telling you the order was already placed?`);

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
      {
        method: 'GET', path: '/api/v1/orders/ORD-9999',
        description: 'Fetch the order receipt. In a real system the ID would be dynamic. Notice the total field returned.',
        handler: () => ({
          // BUG ORD-01/ORD-03: hardcoded ID and total:0 — never reflects the real order.
          status: 200,
          body: {
            id: 'ORD-9999',
            status: 'Processing',
            total: 0,
            created_at: new Date().toISOString(),
            items: [],
          },
        }),
      },
      {
        method: 'DELETE', path: '/api/v1/cart',
        description: 'Should be called to clear the cart after a successful order. Is it being called?',
        // BUG ORD-02: cart is never actually cleared.
        handler: () => ({ status: 200, body: { cleared: false } }),
      }
    ]);

    setSolutions([
      {
        bugId: 'ORD-01', title: 'Order ID is always hardcoded as ORD-9999',
        location: 'OrderConfirmation.tsx', technique: 'Data Integrity',
        buggyCode: `<p>Your simulated order ID is: <strong>ORD-9999</strong></p>`,
        fixedCode: `const orderId = \`ORD-\${Math.floor(1000 + Math.random() * 9000)}\`;
<p>Your simulated order ID is: <strong>{orderId}</strong></p>`,
        explanation: 'The order ID is a hardcoded string literal. Every order shows the same ID, making it impossible to distinguish orders.',
      },
      {
        bugId: 'ORD-02', title: 'Cart is not cleared after successful order',
        location: 'OrderConfirmation.tsx', technique: 'Stale State',
        buggyCode: `// No clearCart() call on this page`,
        fixedCode: `const { clearCart } = useCart();
useEffect(() => { clearCart(); }, []);`,
        explanation: 'After a successful purchase the cart items are never removed. Going back shows the same items still in the cart.',
      },
      {
        bugId: 'ORD-03', title: 'Order total saved as 0 instead of actual cart total',
        location: 'OrderConfirmation.tsx', technique: 'Data Integrity',
        buggyCode: `total: 0  // hardcoded in mock DB entry`,
        fixedCode: `// Pass total via router state: navigate('/catalog/checkout/success', { state: { total } })
// Then read: const { total } = useLocation().state`,
        explanation: 'The order record stores total: 0 because the cart total is never passed to the confirmation page.',
      },
      {
        bugId: 'ORD-04', title: 'Success state has no aria-live announcement or focus shift',
        location: 'OrderConfirmation.tsx — success message', technique: 'Accessibility',
        buggyCode: `<h1>Order Confirmed!</h1>
{/* no aria-live region, no focus() call on mount */}`,
        fixedCode: `<h1 tabIndex={-1} ref={headingRef} aria-live="polite">Order Confirmed!</h1>
useEffect(() => { headingRef.current?.focus(); }, []);`,
        explanation: 'A screen-reader user landing here gets no announcement that the purchase succeeded — the page is silent.',
      },
      {
        bugId: 'ORD-05', title: 'No order summary (items, address) is shown',
        location: 'OrderConfirmation.tsx — page body', technique: 'Missing Functionality',
        buggyCode: `<h1>Order Confirmed!</h1>
<p>Your simulated order ID is: ORD-9999</p>
{/* no line items, no shipping address, no payment summary */}`,
        fixedCode: `<OrderSummary items={cartItemsAtCheckout} address={shippingAddress} total={total} />`,
        explanation: 'A customer has no way to verify what they actually bought or where it\'s being shipped — only a generic checkmark and an ID.',
      },
      {
        bugId: 'ORD-06', title: 'No estimated delivery date or next-steps info',
        location: 'OrderConfirmation.tsx — page body', technique: 'Content Bug',
        buggyCode: `<p>Your simulated order ID is: ORD-9999</p>
<button onClick={() => navigate('/catalog')}>Return to Catalog</button>
{/* nothing about when the order will arrive */}`,
        fixedCode: `<p>Estimated delivery: 3–5 business days. A confirmation email has been sent.</p>`,
        explanation: 'The confirmation ends abruptly with no indication of what the customer should expect next.',
      },
      {
        bugId: 'ORD-07', title: 'Refreshing gives no indication the order was already placed',
        location: 'OrderConfirmation.tsx — page mount behavior', technique: 'Idempotency',
        buggyCode: `// The page re-renders identically on every reload with the same
// hardcoded ORD-9999, no "already placed" state, no idempotency key.`,
        fixedCode: `// Persist a placed-order flag/id and short-circuit any resubmission
// logic on remount, warning the user instead of silently repeating it.`,
        explanation: 'In a real system, actions tied to this page firing again on refresh could double-submit the order — there is no safeguard or messaging around that risk.',
      },
    ]);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
