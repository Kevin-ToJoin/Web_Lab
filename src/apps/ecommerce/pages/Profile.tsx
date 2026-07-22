import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';

export const Profile = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { savedAddress, savedEmail, saveProfile } = useCart();
  const [address, setAddress] = useState(savedAddress);
  const [email, setEmail] = useState(savedEmail);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRequirements(`## Profile
### Acceptance Criteria:
- Must let the customer save a default shipping address and email.
- Saving must give clear success feedback.
- Saved values must actually be used to pre-fill Checkout.
- Labels must be programmatically associated with their inputs.
- Email must be validated before saving.

### Bug Hints (7 bugs on this page):
- 🐛 **Level 3 (Accessibility):** Click directly on the "Email" label. Does focus move to the input?
- 🐛 **Level 3:** Save an obviously invalid email like "nope". Any warning?
- 🐛 **Level 3:** Save your address here, then go to Checkout. Does it appear pre-filled? *(cross-reference ECO-30)*
- 🐛 **Level 1:** Is there any link to this Profile page from the Storefront or header?
- 🐛 **Level 4 (Boundary):** Paste a 5,000-character string into the Address field. Any limit?
- 🐛 **Level 3 (Stale State):** Save your profile, then start editing the address again without saving. Does the "Profile saved." message still show, even though your new edit isn't saved?
- 🐛 **Level 1:** Is there any link from this page to your Order History?`);

    setDbTables({ Saved_Profile: [{ address: savedAddress || '(none)', email: savedEmail || '(none)' }] });
    setApiEndpoints([
      {
        method: 'PUT', path: '/api/profile', description: 'Saves the default address/email.',
        payloadTemplate: `{\n  "address": "${address}",\n  "email": "${email}"\n}`,
        handler: (requestBody: string) => {
          try { JSON.parse(requestBody || '{}'); return { status: 200, body: { saved: true } }; }
          catch { return { status: 400, body: { error: 'Invalid JSON body' } }; }
        },
      },
    ]);

    setRemoteSolutions({ app: 'ecommerce', bugIds: ['ECO-39', 'ECO-40', 'ECO-41', 'ECO-42', 'ECO-63', 'ECO-64', 'ECO-65'] });
  }, [address, email, savedAddress, savedEmail, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  const handleSave = () => {
    saveProfile(address, email);
    setSaved(true);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/ecommerce')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Store
      </button>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Profile</h1>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div className="input-group">
          <label className="input-label">Email</label>
          <input className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="input-group" style={{ marginTop: '1rem' }}>
          <label className="input-label">Default Shipping Address</label>
          <textarea className="input-field" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleSave}>Save Profile</button>
        {saved && <p style={{ color: 'var(--success)', marginTop: '1rem' }}>Profile saved.</p>}
      </div>
    </div>
  );
};
