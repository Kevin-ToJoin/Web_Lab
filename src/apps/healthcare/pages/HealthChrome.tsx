import { ArrowLeft, Activity } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router-dom';

const NAV = [
  { to: '/healthcare', label: 'Records', end: true },
  { to: '/healthcare/copay', label: 'Copay' },
  { to: '/healthcare/appointments', label: 'Appointments' },
  { to: '/healthcare/vitals', label: 'Vitals & Rx' },
];

// Shared header + nav for all MediPortal pages.
export const HealthChrome = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>MediPortal Connect</h1>
          <p>Patient portal: records, insurance, appointments, and vitals. (Difficulty: Expert)</p>
        </div>
        <Activity size={32} style={{ color: 'var(--primary)' }} />
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
