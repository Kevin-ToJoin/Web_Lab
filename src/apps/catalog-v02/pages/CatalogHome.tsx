import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';

export const CatalogHome = () => {
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Inject Requirements
    setRequirements(`## Catalog Dashboard (Home)
### Acceptance Criteria:
- Must display **exactly 3** featured products.
- "Shop by Category" buttons must navigate to the correct filtered category view.
- The search bar must redirect to Search Results with the query in the URL (\`?q=term\`).
- The hero banner "Shop Now" button must navigate to a relevant page.
- Product names and descriptions must contain no typos or placeholder text.
- Inactive promotions must NOT be displayed to users.

### Bug Hints (3 bugs on this page):
- 🐛 **Level 1:** Inspect the product cards carefully — do any descriptions look like placeholder text?
- 🐛 **Level 1:** Try clicking the "Shop Now" button in the hero banner. What happens?
- 🐛 **Level 1:** Trigger a search by typing something and pressing a key that isn't Enter. Does the search fire?

### DB Cross-check:
Compare the \`Featured_Promos\` table — notice \`promo2\` has \`active: false\`. Is the "Up to 50% off" banner correct?`);

    // 2. Inject DB Tables
    setDbTables({
      'Featured_Promos': [
        { id: 'promo1', active: true, discount: '20%', label: 'Spring Sale' },
        { id: 'promo2', active: false, discount: '50%', label: 'Summer Clearance' }
      ],
      'Products_Table_Preview': database.products.slice(0, 3),
      'Categories_Table': [
        { id: 'CAT-1', name: 'Electronics', productCount: database.products.filter(p => p.category === 'Electronics').length },
        { id: 'CAT-2', name: 'Home Goods', productCount: database.products.filter(p => p.category === 'Home Goods').length },
        { id: 'CAT-3', name: 'Apparel', productCount: database.products.filter(p => p.category === 'Apparel').length },
        { id: 'CAT-4', name: 'Accessories', productCount: database.products.filter(p => p.category === 'Accessories').length }
      ]
    });

    // 3. Inject API Endpoints
    setApiEndpoints([
      {
        method: 'GET',
        path: '/api/v1/products/featured',
        description: 'Returns the 3 promoted products shown in the dashboard.',
        handler: async () => {
          try {
            const data = await MockAPI.getProducts();
            return { status: 200, body: data.slice(0, 3) };
          } catch (e) {
            return { status: 500, body: { error: (e as Error).message } };
          }
        },
      },
      { method: 'GET', path: '/api/v1/categories', description: 'Returns all available store categories with product counts.' },
      { method: 'GET', path: '/api/v1/promos/active', description: 'Returns currently active promotional banners.' }
    ]);

    setSolutions([
      {
        bugId: 'CAT-HOME-01', title: '"Shop Now" button has no navigation handler',
        location: 'CatalogHome.tsx — hero banner button', technique: 'Missing Functionality',
        buggyCode: `<button className="btn btn-secondary" style={{ background: '#000', border: 'none' }}>
  Shop Now
</button>`,
        fixedCode:  `<button className="btn btn-secondary"
  style={{ background: '#000', border: 'none' }}
  onClick={() => navigate('/catalog/category/Electronics')}>
  Shop Now
</button>`,
        explanation: 'The "Shop Now" button has no onClick handler. Clicking it does nothing. It should navigate to the sale category.',
      },
      {
        bugId: 'CAT-HOME-02', title: 'Hero banner claims 50% off but promo2 is inactive',
        location: 'CatalogHome.tsx — hero banner text / mockDatabase', technique: 'Content Bug',
        buggyCode: `<p style={{ color: '#000', marginBottom: '2rem' }}>Up to 50% off selected electronics.</p>
// DB: { id: 'promo2', active: false, discount: '50%' }`,
        fixedCode:  `<p style={{ color: '#000', marginBottom: '2rem' }}>Up to 20% off selected electronics.</p>
// Only promo1 (active: true, discount: '20%') should be advertised`,
        explanation: 'The active promotion is promo1 (20% off). promo2 (50% off) is inactive. The banner is advertising a discount that is not running.',
      },
    ]);

    // Fetch data
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    MockAPI.getProducts().then(data => {
      setFeatured(data.slice(0, 3));
      setLoading(false);
    });
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

      {loading ? (
        <div className="grid-cards" aria-busy="true" aria-label="Loading featured products">
          {[1, 2, 3].map(n => (
            <div key={n} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div className="skeleton" style={{ width: '100%', height: '150px', borderRadius: '4px', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ width: '70%', height: '1rem', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ width: '30%', height: '1rem' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-cards">
          {featured.map(p => (
            <div key={p.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' }} />
              <h4 style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate(`/catalog/product/${p.id}`)}>{p.name}</h4>
              <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>${p.price.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
