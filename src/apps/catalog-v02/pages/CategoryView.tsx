import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';
import { ArrowLeft } from 'lucide-react';

export const CategoryView = () => {
  const { catName } = useParams<{ catName: string }>();
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Inject Requirements
    setRequirements(`## Category View: ${catName}
### Acceptance Criteria:
- **Only** products whose \`category\` field exactly matches \`"${catName}"\` should appear.
- The UI must show a loading indicator while results are being fetched.
- Each product card must show the correct name, price, and image.
- Product names must contain no typos.
- If a category has no products, show a friendly "No products found" message.

### Bug Hints (1 bug in this area):
- 🐛 **Functional correctness (Level 4, Equivalence):** Navigate to **Home Goods**. Do all displayed products actually belong to that category? Use the DB Viewer to cross-check — \`Products_Table\` shows the ground truth.

### DB Cross-check:
The \`Products_Table\` below shows the **correct** expected dataset for category \`"${catName}"\`. Compare it against what the UI actually renders.`);

    // 2. Inject DB Tables
    setDbTables({
      'Products_Table': database.products.filter(p => p.category === catName),
      'All_Products_By_Category': [
        { category: 'Electronics', count: database.products.filter(p => p.category === 'Electronics').length },
        { category: 'Home Goods', count: database.products.filter(p => p.category === 'Home Goods').length },
        { category: 'Apparel', count: database.products.filter(p => p.category === 'Apparel').length },
        { category: 'Accessories', count: database.products.filter(p => p.category === 'Accessories').length }
      ]
    });

    // 3. Inject API Endpoints
    setApiEndpoints([
      {
        method: 'GET',
        path: `/api/v1/products?category=${catName}`,
        description: `Fetches products for category "${catName}". Expected: ${database.products.filter(p => p.category === catName).length} items. Click Send to see what the API actually returns.`,
        expectedResponse: JSON.stringify(database.products.filter(p => p.category === catName), null, 2),
        handler: async () => {
          try {
            const data = await MockAPI.getProducts('', catName);
            return { status: 200, body: data };
          } catch (e) {
            return { status: 500, body: { error: (e as Error).message } };
          }
        }
      }
    ]);
    setSolutions([
      {
        bugId: 'CAT-05', title: 'Home Goods filter includes Electronics products',
        location: 'MockAPI.ts ~line 33', technique: 'Equivalence Partitioning',
        buggyCode: `if (category === 'Home Goods' && p.category === 'Electronics') {
  return true; // BUG: Electronics sneaks into Home Goods
}
return p.category === category;`,
        fixedCode:  `return p.category === category;`,
        explanation: 'A spurious if-block forces all Electronics products to be included when filtering by "Home Goods". Removing the extra branch fixes the filter.',
      },
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
