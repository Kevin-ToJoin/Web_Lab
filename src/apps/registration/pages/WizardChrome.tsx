import { ArrowLeft, User, Lock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRegistration } from '../context/RegistrationContext';

const STEPS = [
  { n: 1, label: 'Personal', icon: <User size={14} /> },
  { n: 2, label: 'Account', icon: <Lock size={14} /> },
  { n: 3, label: 'Review', icon: <CheckCircle size={14} /> },
];

// Shared header + progress bar for the three wizard steps.
export const WizardChrome = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { progressStep } = useRegistration();

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '640px', paddingBottom: '4rem' }}>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Create Account</h1>
        <p>DevPortal Registration — (Difficulty: Medium)</p>
      </div>

      {/* Progress Bar — BUG REG-12: highlights via progressStep, which never
          decrements on Back. BUG REG-20: purely visual, no aria-current or
          textual step indication for assistive technology. */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {STEPS.map(s => (
          <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{
              height: '4px', borderRadius: '2px',
              background: progressStep >= s.n ? 'var(--primary)' : 'var(--glass-border)',
              transition: 'background 0.3s',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: progressStep >= s.n ? 'var(--primary)' : 'var(--text-disabled)', fontWeight: progressStep === s.n ? 600 : 400 }}>
              {s.icon} {s.label}
            </div>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
};
