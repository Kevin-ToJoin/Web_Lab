
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Bug, ShoppingCart, Landmark, Activity, LineChart, ChevronRight } from 'lucide-react';
import './index.css';
import { CatalogAppV01 } from './apps/catalog-v01';
import { EcommerceApp } from './apps/EcommerceApp';
import { BankApp } from './apps/BankApp';
import { HealthcareApp } from './apps/HealthcareApp';
import { TradingApp } from './apps/TradingApp';

// --- Placeholders for our 5 apps ---
// --- Placeholders for our 5 apps ---
// --- Placeholders for our 5 apps ---
// --- Placeholders for our 5 apps ---
// --- Placeholders for our 5 apps ---
// --- Placeholders for our 5 apps ---

// --- Main Menu ---
const MainMenu = () => {
  const navigate = useNavigate();

  const apps = [
    {
      id: 'catalog',
      title: 'Product Catalog',
      description: 'Easy: Basic observation & UI bugs.',
      level: 'Levels 1-2',
      icon: <Bug size={24} className="app-icon" style={{ color: 'var(--success)' }}/>,
      path: '/catalog',
    },
    {
      id: 'ecommerce',
      title: 'E-commerce Store',
      description: 'Medium: Boundary value & equivalence bugs.',
      level: 'Levels 3-5',
      icon: <ShoppingCart size={24} className="app-icon" style={{ color: 'var(--primary)' }}/>,
      path: '/ecommerce',
    },
    {
      id: 'bank',
      title: 'Bank Core System',
      description: 'Hard: State transitions & session bugs.',
      level: 'Levels 6-8',
      icon: <Landmark size={24} className="app-icon" style={{ color: '#eab308' }}/>,
      path: '/bank',
    },
    {
      id: 'healthcare',
      title: 'Patient Portal',
      description: 'Expert: Decision tables & complex logic.',
      level: 'Levels 8-9',
      icon: <Activity size={24} className="app-icon" style={{ color: 'var(--secondary)' }}/>,
      path: '/healthcare',
    },
    {
      id: 'trading',
      title: 'Trading Dashboard',
      description: 'Impossible: Race conditions & float cascades.',
      level: 'Level 10',
      icon: <LineChart size={24} className="app-icon" style={{ color: 'var(--danger)' }}/>,
      path: '/trading',
    }
  ];

  return (
    <div className="container animate-fade-in">
      <header style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Bug size={48} color="var(--primary)" />
          <h1 style={{ fontSize: '3rem' }} className="text-glow">TestLab <span style={{ color: 'var(--primary)' }}>101</span></h1>
        </div>
        <p style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          A professional sandbox for QA engineers. 
          Choose an environment and discover intentionally injected bugs ranging from trivial to impossible.
        </p>
      </header>

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
              <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)' }}>
                {app.level}
              </span>
            </div>
            <h3>{app.title}</h3>
            <p style={{ flexGrow: 1 }}>{app.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', fontWeight: 500, marginTop: '1rem' }}>
              Start Testing <ChevronRight size={18} />
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/catalog/*" element={<CatalogAppV01 />} />
        <Route path="/ecommerce" element={<EcommerceApp />} />
        <Route path="/bank" element={<BankApp />} />
        <Route path="/healthcare" element={<HealthcareApp />} />
        <Route path="/trading" element={<TradingApp />} />
      </Routes>
    </Router>
  );
}

export default App;
