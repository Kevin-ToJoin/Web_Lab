import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';

export const OrderConfirmation = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints } = useQAPanel();

  useEffect(() => {
    setRequirements(`## Order Confirmation
### Acceptance Criteria:
- Must display a randomly generated Order ID.
- Must display a "Return to Dashboard" button.
- Cart should be empty at this point.
- **Bug Hint:** Is the cart actually emptied? Did the Order ID actually get saved to the DB?`);

    setDbTables({
      'Orders_Table': [
        { id: 'ORD-9999', status: 'Processing', total: 0 } // Bug: total wasn't saved!
      ]
    });

    setApiEndpoints([
      { method: 'GET', path: '/api/v1/orders/ORD-9999', description: 'Fetch order receipt.' }
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
