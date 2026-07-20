import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { ArrowLeft, User, Package, Settings } from 'lucide-react';

export const UserProfile = () => {
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  useEffect(() => {
    setRequirements(`## User Profile
### Acceptance Criteria:
- Must display user's name and email address.
- The API response must **not** include sensitive fields like password hashes or internal flags.

### Bug Hints (1 bug on this page):
- 🐛 **Security (Level 9):** Click the API tab and call \`GET /api/v1/users/me\`. Inspect the response — what sensitive fields are being sent to the frontend that should never leave the server?

### Security Rule:
The API must never expose \`passwordHash\`, raw \`isAdmin\` flags, or internal user IDs to the frontend. These must be stripped server-side before sending the response.`);

    setDbTables({
      'Users_Table': [
        {
          id: 'U-123',
          name: 'Jane Doe',
          email: 'jane@example.com',
          passwordHash: '$2b$12$L7p.tH6.R/b8T2H...xyz',  // Should NEVER reach frontend
          isAdmin: false,
          createdAt: '2022-06-15T08:00:00Z'
        }
      ],
      'API_Safe_Response': [
        {
          note: 'Only these fields should be sent to frontend:',
          id: 'U-123',
          name: 'Jane Doe',
          email: 'jane@example.com'
        }
      ],
      'Past_Orders': [
        { id: 'ORD-101', date: '2023-01-15', total: 145.50, status: 'Delivered' },
        { id: 'ORD-102', date: '2023-04-22', total: 89.99, status: 'Delivered' },
        { id: 'ORD-103', date: '2024-02-10', total: 299.00, status: 'Processing' }
      ]
    });

    setApiEndpoints([
      {
        method: 'GET', path: '/api/v1/users/me',
        description: 'Fetches current user profile. Check the response for fields that should not be exposed.',
        // BUG USER-01: returns the full DB row including passwordHash + isAdmin.
        handler: () => ({
          status: 200,
          body: {
            id: 'U-123',
            name: 'Jane Doe',
            email: 'jane@example.com',
            passwordHash: '$2b$12$L7p.tH6.R/b8T2H...xyz',
            isAdmin: false,
            createdAt: '2022-06-15T08:00:00Z',
          },
        }),
      },
      {
        method: 'PUT', path: '/api/v1/users/me',
        description: 'Updates user name/email. Should return 200 with updated user and display a success toast.',
        payloadTemplate: '{\n  "name": "Jane Doe",\n  "email": "jane@example.com"\n}',
        handler: (requestBody: string) => {
          try {
            JSON.parse(requestBody);
          } catch {
            return { status: 400, body: { error: 'Invalid JSON' } };
          }
          // Returns success but there is no real persistence layer behind it.
          return { status: 200, body: { updated: true } };
        },
      },
      { method: 'GET', path: '/api/v1/users/me/orders', description: 'Returns past orders. Should be called when the Orders tab is clicked.' }
    ]);

    setSolutions([
      {
        bugId: 'USER-01', title: 'API exposes passwordHash to frontend',
        location: 'mockDatabase.ts / API response', technique: 'Security',
        buggyCode: `// GET /api/v1/users/me returns full user row including passwordHash`,
        fixedCode: `const { passwordHash, isAdmin, ...safeUser } = user;
return safeUser; // only id, name, email`,
        explanation: 'The user endpoint returns the full database row, including the password hash. Sensitive fields must be stripped server-side before sending the response.',
      },
    ]);
  }, [setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
