import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { ArrowLeft, User, Package, Settings } from 'lucide-react';

export const UserProfile = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints } = useQAPanel();

  useEffect(() => {
    setRequirements(`## User Profile
### Acceptance Criteria:
- Must display user's personal info securely.
- Must list past orders.
- **Bug Hint:** Look at the DB view. Is PII (Personally Identifiable Information) or password hashes being leaked to the frontend?`);

    setDbTables({
      'Users_Table': [
        { 
          id: 'U-123', 
          name: 'Jane Doe', 
          email: 'jane@example.com',
          // Level 9 Security Bug: Leaking password hash to frontend!
          passwordHash: '$2b$12$L7p.tH6.R/b8T2H...xyz', 
          isAdmin: false
        }
      ],
      'Past_Orders': [
        { id: 'ORD-101', date: '2023-01-15', total: 145.50 },
        { id: 'ORD-102', date: '2023-04-22', total: 89.99 }
      ]
    });

    setApiEndpoints([
      { method: 'GET', path: '/api/v1/users/me', description: 'Fetches the current user profile data.' },
      { method: 'PUT', path: '/api/v1/users/me', description: 'Updates user profile.', payloadTemplate: '{\n  "name": "Jane Doe"\n}' }
    ]);
  }, [setRequirements, setDbTables, setApiEndpoints]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/catalog')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Home
      </button>

      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>My Profile</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Sidebar */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'flex-start', border: 'none', background: 'rgba(255,255,255,0.05)' }}><User size={18} style={{marginRight: '0.5rem'}}/> Personal Info</button>
            <button className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}><Package size={18} style={{marginRight: '0.5rem'}}/> Orders</button>
            <button className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'flex-start', border: 'none', background: 'transparent' }}><Settings size={18} style={{marginRight: '0.5rem'}}/> Settings</button>
          </div>
        </div>

        {/* Content */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Personal Information</h2>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input type="text" className="input-field" defaultValue="Jane Doe" />
          </div>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input type="email" className="input-field" defaultValue="jane@example.com" />
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Save Changes</button>
        </div>

      </div>
    </div>
  );
};
