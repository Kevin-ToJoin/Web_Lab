import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';

export const Profile = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
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

    const solutions: BugSolution[] = [
      {
        bugId: 'ECO-39', title: 'Email/Address labels are not associated with their inputs',
        location: 'Profile.tsx — form fields', technique: 'Accessibility',
        buggyCode: `<label className="input-label">Email</label>\n<input value={email} onChange={...} />`,
        fixedCode: `<label htmlFor="profileEmail">Email</label>\n<input id="profileEmail" value={email} onChange={...} />`,
        explanation: 'Without a matching htmlFor/id pair, clicking the label doesn\'t focus the input and screen readers can\'t announce the field name.',
      },
      {
        bugId: 'ECO-40', title: 'Email is saved with no format validation',
        location: 'Profile.tsx — handleSave', technique: 'Equivalence Partitioning',
        buggyCode: `const handleSave = () => { saveProfile(address, email); }; // no format check`,
        fixedCode: `if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) return setError('Invalid email.');`,
        explanation: 'Any string, including "nope", is accepted and persisted as the saved email.',
      },
      {
        bugId: 'ECO-41', title: 'No link to Profile from the Storefront or header',
        location: 'Storefront.tsx / header', technique: 'Missing Functionality',
        buggyCode: `{/* header only has a cart icon — no profile/account link anywhere */}`,
        fixedCode: `<button onClick={() => navigate('/ecommerce/profile')}>My Profile</button>`,
        explanation: 'The route works, but a customer has no discoverable way to reach it from normal navigation.',
      },
      {
        bugId: 'ECO-42', title: 'Saved address doesn\'t flow into Checkout',
        location: 'Checkout.tsx — initial state', technique: 'Missing Functionality',
        buggyCode: `const [address, setAddress] = useState(''); // ignores savedAddress`,
        fixedCode: `const [address, setAddress] = useState(savedAddress);`,
        explanation: 'Saving a profile address here has no visible effect anywhere else in the app — see the matching Checkout bug (ECO-30).',
      },
      {
        bugId: 'ECO-63', title: 'Address field has no maximum length',
        location: 'Profile.tsx — address textarea', technique: 'Boundary Value',
        buggyCode: `<textarea value={address} onChange={...} /> // no maxLength`,
        fixedCode: `<textarea maxLength={200} value={address} onChange={...} />`,
        explanation: 'There is no upper bound on the saved address length.',
      },
      {
        bugId: 'ECO-64', title: '"Profile saved" message never clears on further edits',
        location: 'Profile.tsx — saved state', technique: 'Stale State',
        buggyCode: `const [saved, setSaved] = useState(false);
// setSaved(false) is never called when address/email change again`,
        fixedCode: `const handleChange = (setter) => (e) => { setter(e.target.value); setSaved(false); };`,
        explanation: 'After saving once, further unsaved edits still show the old "Profile saved." success message, misleading the user about their current state.',
      },
      {
        bugId: 'ECO-65', title: 'No link from Profile to Order History',
        location: 'Profile.tsx — page layout', technique: 'Missing Functionality',
        buggyCode: `{/* only a "Back to Store" button — no cross-link to Order History */}`,
        fixedCode: `<button onClick={() => navigate('/ecommerce/orders')}>View Order History</button>`,
        explanation: 'Both pages are account-related, but there\'s no way to move between them without going back through the storefront.',
      },
    ];
    setSolutions(solutions);
  }, [address, email, savedAddress, savedEmail, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
