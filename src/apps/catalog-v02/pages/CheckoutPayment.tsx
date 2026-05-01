import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { useCart } from '../context/CartContext';

export const CheckoutPayment = () => {
  const navigate = useNavigate();
  const { total } = useCart();
  const { setRequirements, setDbTables, setApiEndpoints } = useQAPanel();
  
  const [card, setCard] = useState('');

  useEffect(() => {
    setRequirements(`## Checkout: Payment
### Acceptance Criteria:
- Must charge the exact amount matching the Cart total.
- Credit Card must pass Luhn algorithm (or simulated regex).
- Upon success, redirects to confirmation.
- **Bug Hint:** Does the payment gateway get called multiple times if you double click fast?`);

    setDbTables({
      'Transactions_Ledger': []
    });

    setApiEndpoints([
      { method: 'POST', path: '/api/v1/payment/charge', description: 'Charges the credit card.', payloadTemplate: `{\n  "amount": ${total},\n  "card": "${card}"\n}` }
    ]);
  }, [total, card, setRequirements, setDbTables, setApiEndpoints]);

  const handlePay = () => {
    // BUG: Race condition / Double submission
    // Button doesn't disable while processing!
    navigate('/catalog/checkout/success');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Payment Details</h1>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Total to charge: <span style={{ color: 'var(--primary)' }}>${total.toFixed(2)}</span></h2>
        
        <div className="input-group">
          <label className="input-label">Card Number</label>
          <input type="text" className="input-field" value={card} onChange={e => setCard(e.target.value)} placeholder="0000 0000 0000 0000" />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Expiry</label>
            <input type="text" className="input-field" placeholder="MM/YY" />
          </div>
          <div className="input-group">
            <label className="input-label">CVC</label>
            <input type="text" className="input-field" placeholder="123" />
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handlePay}>
          Authorize Payment
        </button>
      </div>
    </div>
  );
};
