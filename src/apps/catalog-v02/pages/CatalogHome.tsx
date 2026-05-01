import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';

export const CatalogHome = () => {
  const { setRequirements, setDbTables, setApiEndpoints } = useQAPanel();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    // 1. Inject Requirements
    setRequirements(`## Catalog Dashboard (Home)
### Acceptance Criteria:
- Must display exactly 3 featured items.
- "Shop by Category" must link to valid category filters.
- Search bar must redirect to the Search Results page with the query in the URL.
- **Bug Hint:** Look for hardcoded state or missing navigation links.`);

    // 2. Inject DB Tables
    setDbTables({
      'Featured_Promos': [
        { id: 'promo1', active: true, discount: '20%' },
        { id: 'promo2', active: false, discount: '50%' }
      ],
      'Products_Table_Preview': database.products.slice(0, 2)
    });

    // 3. Inject API Endpoints
    setApiEndpoints([
      { method: 'GET', path: '/api/v1/products/featured', description: 'Returns a list of promoted products.' },
      { method: 'GET', path: '/api/v1/categories', description: 'Returns available store categories.' }
    ]);

    // Fetch data
    MockAPI.getProducts().then(data => setFeatured(data.slice(0, 3)));
  }, [setRequirements, setDbTables, setApiEndpoints]);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem' }}>TechMart v02</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/catalog/profile')}>Profile</button>
          <button className="btn btn-primary" onClick={() => navigate('/catalog/cart')}>Cart</button>
        </div>
      </div>

      <div style={{ background: 'var(--primary)', padding: '3rem', borderRadius: 'var(--radius-lg)', marginBottom: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#000' }}>Spring Sale Event!</h2>
        <p style={{ color: '#000', marginBottom: '2rem' }}>Up to 50% off selected electronics.</p>
        <button className="btn btn-secondary" style={{ background: '#000', border: 'none' }}>Shop Now</button>
      </div>

      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Shop by Category</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        {['Electronics', 'Home Goods', 'Apparel', 'Accessories'].map(cat => (
          <div 
            key={cat} 
            className="glass-panel" 
            style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => navigate(`/catalog/category/${encodeURIComponent(cat)}`)}
          >
            {cat}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.5rem' }}>Featured Products</h3>
        <div className="input-group" style={{ margin: 0 }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search..." 
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(`/catalog/search?q=${e.currentTarget.value}`);
            }}
          />
        </div>
      </div>

      <div className="grid-cards">
        {featured.map(p => (
          <div key={p.id} className="glass-panel" style={{ padding: '1.5rem' }}>
            <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' }} />
            <h4 style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate(`/catalog/product/${p.id}`)}>{p.name}</h4>
            <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>${p.price.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
