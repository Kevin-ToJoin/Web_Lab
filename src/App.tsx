
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Bug, ShoppingCart, Landmark, Activity, LineChart, ChevronRight, Home, UserPlus } from 'lucide-react';
import './index.css';
import { CatalogAppV02 } from './apps/catalog-v02';
import { EcommerceApp } from './apps/EcommerceApp';
import { BankApp } from './apps/BankApp';
import { HealthcareApp } from './apps/HealthcareApp';
import { TradingApp } from './apps/TradingApp';
import { RegistrationApp } from './apps/RegistrationApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BugReporterProvider } from './context/BugReporterContext';
import { BugReporterButton } from './components/BugReporter/BugReporterButton';
import { BugReporterModal } from './components/BugReporter/BugReporterModal';
import { MyReportsPanel } from './components/BugReporter/MyReportsPanel';
import { knownBugs, TOTAL_BUGS } from './data/knownBugs';

// --- Main Menu ---
const MainMenu = () => {
  const navigate = useNavigate();

  const bugCountFor = (id: string) => knownBugs.filter(b => b.appId === id).length;

  const apps = [
    {
      id: 'catalog',
      title: 'Product Catalog',
      description: 'Basic observation & UI bugs. Great starting point for beginners.',
      level: 'Levels 1–2',
      difficulty: 'Easy',
      difficultyColor: 'var(--success)',
      icon: <Bug size={24} className="app-icon" style={{ color: 'var(--success)' }}/>,
      path: '/catalog',
    },
    {
      id: 'ecommerce',
      title: 'E-commerce Store',
      description: 'Boundary value & equivalence partitioning bugs in cart and checkout.',
      level: 'Levels 3–5',
      difficulty: 'Medium',
      difficultyColor: 'var(--primary)',
      icon: <ShoppingCart size={24} className="app-icon" style={{ color: 'var(--primary)' }}/>,
      path: '/ecommerce',
    },
    {
      id: 'registration',
      title: 'Registration Portal',
      description: 'Multi-step form with state bugs',
      level: 'Levels 3–6',
      difficulty: 'Medium',
      difficultyColor: 'var(--primary)',
      icon: <UserPlus size={24} className="app-icon" style={{ color: 'var(--primary)' }}/>,
      path: '/registration',
    },
    {
      id: 'bank',
      title: 'Bank Core System',
      description: 'State transitions, session management & async submission bugs.',
      level: 'Levels 6–8',
      difficulty: 'Hard',
      difficultyColor: '#eab308',
      icon: <Landmark size={24} className="app-icon" style={{ color: '#eab308' }}/>,
      path: '/bank',
    },
    {
      id: 'healthcare',
      title: 'Patient Portal',
      description: 'Decision table logic, complex date validation & unreachable branches.',
      level: 'Levels 8–9',
      difficulty: 'Expert',
      difficultyColor: 'var(--secondary)',
      icon: <Activity size={24} className="app-icon" style={{ color: 'var(--secondary)' }}/>,
      path: '/healthcare',
    },
    {
      id: 'trading',
      title: 'Trading Dashboard',
      description: 'Race conditions, floating-point cascades & timezone offset bugs.',
      level: 'Level 10',
      difficulty: 'Impossible',
      difficultyColor: 'var(--danger)',
      icon: <LineChart size={24} className="app-icon" style={{ color: 'var(--danger)' }}/>,
      path: '/trading',
    }
  ];

  return (
    <div className="container animate-fade-in">
      <header style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Bug size={48} color="var(--primary)" />
          <h1 style={{ fontSize: '3rem' }} className="text-glow">TestLab <span style={{ color: 'var(--primary)' }}>101</span></h1>
        </div>
        <p style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto', color: 'var(--text-muted)' }}>
          A professional sandbox for QA engineers. Choose an environment and discover
          intentionally injected bugs — from trivial to impossible.
        </p>
        <p style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '1.25rem',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--primary)',
          padding: '0.4rem 1rem',
          background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--primary) 35%, transparent)',
          borderRadius: 'var(--radius-full)'
        }}>
          🐛 {TOTAL_BUGS} intentionally injected bugs across {apps.length} apps
        </p>
      </header>

      {/* How to use */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2.5rem', borderLeft: '3px solid var(--primary)' }}>
        <h3 style={{ marginBottom: '0.75rem', color: 'var(--primary)' }}>How to use this lab</h3>
        <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <li>Pick an environment below — start with <strong style={{ color: 'var(--text-primary)' }}>Product Catalog</strong> if you're new.</li>
          <li>Use the <strong style={{ color: 'var(--text-primary)' }}>QA Inspector</strong> panel on the right to read requirements and inspect data.</li>
          <li>Find the bugs by testing the UI against the listed acceptance criteria.</li>
          <li>Document each bug as you would in a real bug report (title, steps, expected vs. actual).</li>
        </ol>
      </div>

      <div className="grid-cards">
        {apps.map((app, index) => (
          <div
            key={app.id}
            className="glass-panel app-card"
            style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              cursor: 'pointer',
              animationDelay: `${index * 0.1}s`
            }}
            onClick={() => navigate(app.path)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {app.icon}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  background: `color-mix(in srgb, ${app.difficultyColor} 15%, transparent)`,
                  color: app.difficultyColor,
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid color-mix(in srgb, ${app.difficultyColor} 40%, transparent)`
                }}>
                  {app.difficulty}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-disabled)', padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)' }}>
                  {app.level}
                </span>
              </div>
            </div>
            <h3>{app.title}</h3>
            <p style={{ flexGrow: 1, color: 'var(--text-muted)' }}>{app.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', fontWeight: 500 }}>
                Start Testing <ChevronRight size={18} />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-disabled)', padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)' }}>
                🐛 {bugCountFor(app.id)} bugs
              </span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .app-card {
          transition: transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal);
        }
        .app-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5);
          border-color: var(--primary);
        }
        .app-card:hover .app-icon {
          transform: scale(1.1);
        }
        .app-icon {
          transition: transform var(--transition-fast);
        }
      `}</style>
    </div>
  );
};

// --- 404 Page ---
const NotFound = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    textAlign: 'center',
    padding: '2rem',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)'
  }}>
    <Bug size={56} color="var(--text-disabled)" />
    <h1 style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--text-disabled)' }}>404</h1>
    <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
      Page not found. This URL doesn't exist in the lab.
    </p>
    <Link
      to="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--primary)',
        color: '#fff',
        padding: '0.75rem 1.75rem',
        borderRadius: '6px',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '1rem'
      }}
    >
      <Home size={18} /> Back to Hub
    </Link>
  </div>
);

function App() {
  return (
    <BugReporterProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/catalog/*" element={
            <ErrorBoundary appName="Product Catalog">
              <CatalogAppV02 />
            </ErrorBoundary>
          } />
          <Route path="/ecommerce" element={
            <ErrorBoundary appName="E-commerce Store">
              <EcommerceApp />
            </ErrorBoundary>
          } />
          <Route path="/registration/*" element={
            <ErrorBoundary><RegistrationApp /></ErrorBoundary>
          } />
          <Route path="/bank" element={
            <ErrorBoundary appName="Bank Core System">
              <BankApp />
            </ErrorBoundary>
          } />
          <Route path="/healthcare" element={
            <ErrorBoundary appName="Patient Portal">
              <HealthcareApp />
            </ErrorBoundary>
          } />
          <Route path="/trading" element={
            <ErrorBoundary appName="Trading Dashboard">
              <TradingApp />
            </ErrorBoundary>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BugReporterButton />
        <BugReporterModal />
        <MyReportsPanel />
      </Router>
    </BugReporterProvider>
  );
}

export default App;
