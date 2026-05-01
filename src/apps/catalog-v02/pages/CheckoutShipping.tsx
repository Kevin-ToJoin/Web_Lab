import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';

export const CheckoutShipping = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints } = useQAPanel();
  
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');

  useEffect(() => {
    setRequirements(`## Checkout: Shipping
### Acceptance Criteria:
- Address cannot be empty.
- ZIP Code must be exactly 5 digits.
- Moving to payment requires a valid shipping zone calculation.
- **Bug Hint:** Are those validations actually enforced when you click "Continue"?`);

    setDbTables({
      'Shipping_Zones_DB': [
        { zone: 'East', fee: 15 },
        { zone: 'West', fee: 20 }
      ]
    });

    setApiEndpoints([
      { method: 'POST', path: '/api/v1/checkout/shipping', description: 'Calculates shipping fees based on ZIP.', payloadTemplate: `{\n  "zip": "${zip}"\n}` }
    ]);
  }, [zip, setRequirements, setDbTables, setApiEndpoints]);

  const handleContinue = () => {
    // BUG: Missing validation completely. It just navigates!
    navigate('/catalog/checkout/payment');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Shipping Address</h1>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div className="input-group">
          <label className="input-label">Full Address <span style={{color: 'red'}}>*</span></label>
          <input type="text" className="input-field" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">ZIP Code <span style={{color: 'red'}}>*</span></label>
          <input type="text" className="input-field" value={zip} onChange={e => setZip(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleContinue}>
          Continue to Payment
        </button>
      </div>
    </div>
  );
};
