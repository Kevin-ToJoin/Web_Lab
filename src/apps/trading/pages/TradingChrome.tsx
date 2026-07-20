import { ArrowLeft } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTrading } from '../context/TradingContext';

const NAV = [
  { to: '/trading', label: 'Trade', end: true },
  { to: '/trading/watchlist', label: 'Watchlist' },
  { to: '/trading/orders', label: 'Orders' },
  { to: '/trading/portfolio', label: 'Portfolio' },
  { to: '/trading/history', label: 'History' },
];

// Shared header + nav for all QuantumTrader Pro pages.
export const TradingChrome = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { cash } = useTrading();

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>QuantumTrader Pro</h1>
          <p>High-frequency execution platform. (Difficulty: Impossible)</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Buying Power</div>
          {/* BUG TRD-02 (unrounded) surfaces on every page that shows cash */}
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>${cash}</div>
        </div>
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
