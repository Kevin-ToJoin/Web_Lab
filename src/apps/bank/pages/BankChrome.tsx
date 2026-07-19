import { ArrowLeft, Landmark } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router-dom';
import { CURRENT_USER } from '../context/BankContext';

const NAV = [
  { to: '/bank', label: 'Dashboard', end: true },
  { to: '/bank/transfer', label: 'Transfer' },
  { to: '/bank/history', label: 'History' },
  { to: '/bank/payees', label: 'Payees' },
  { to: '/bank/statement', label: 'Statement' },
];

// Shared header + nav for all Vault Online pages.
export const BankChrome = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Vault Online Banking</h1>
          <p>Logged in as {CURRENT_USER}. (Difficulty: Hard)</p>
        </div>
        <Landmark size={32} style={{ color: 'var(--primary)' }} />
      </div>

      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="btn btn-secondary"
            style={({ isActive }) => ({
              padding: '0.4rem 1rem',
              fontSize: '0.9rem',
              background: isActive ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent',
              color: isActive ? 'var(--primary)' : undefined,
              border: 'none',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {children}
    </div>
  );
};
