import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';
import { ArrowLeft } from 'lucide-react';

export const CategoryView = () => {
  const { catName } = useParams<{ catName: string }>();
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints } = useQAPanel();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Inject Requirements
    setRequirements(`## Category View: ${catName}
### Acceptance Criteria:
- Only products matching the category "${catName}" should be displayed.
- The UI should indicate a loading state while fetching.
- Pagination should allow viewing more items if results exceed 10.
- **Bug Hint:** The mock database relationships might be flawed! Look at the actual returned API data in the API tab.`);

    // 2. Inject DB Tables
    setDbTables({
      'Products_Table': database.products.filter(p => p.category === catName),
    });

    // 3. Inject API Endpoints
    setApiEndpoints([
      { 
        method: 'GET', 
        path: `/api/v1/products?category=${catName}`, 
        description: 'Fetches products for the specified category.',
        expectedResponse: JSON.stringify(database.products.filter(p => p.category === catName).slice(0, 2), null, 2)
      }
    ]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    MockAPI.getProducts('', catName).then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, [catName, setRequirements, setDbTables, setApiEndpoints]);

  return (
    <div className="animate-fade-in">
      <button className="btn btn-secondary" onClick={() => navigate('/catalog')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Home
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Category: {catName}</h1>

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div className="grid-cards">
          {products.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No products found in this category.</p>
          ) : (
            products.map(p => (
              <div key={p.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' }} />
                <h4 style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate(`/catalog/product/${p.id}`)}>{p.name}</h4>
                <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>${p.price.toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
