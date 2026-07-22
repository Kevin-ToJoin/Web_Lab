import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';
import { ArrowLeft } from 'lucide-react';

export const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 1. Inject Requirements
    setRequirements(`## Search Results
### Acceptance Criteria:
- Must display the query term securely (no XSS).
- Must show a count of found items.
- If the server throws a 500 error, it should display a friendly fallback message, not a raw stack trace.
- A search must never hang indefinitely with no way to cancel or time out.
- **Bug Hint:** Try searching for 'error' to see how the system handles it, or try injecting HTML tags.

### Bug Hints (5 bugs in this area):
- 🐛 **Input validation (Level 3):** Clear the search box entirely and submit. Does it return everything instead of nothing?
- 🐛 **Usability (Level 1):** Search for "stand" — look closely at the product name in the results.
- 🐛 **Security (Level 9):** Search for \`<b>bold</b>\` or a \`<script>\` tag. What renders?
- 🐛 **Reliability (Level 6):** Search for the literal word "error". What do you see?
- 🐛 **Reliability (Level 6):** Search for the literal word "infinite". How long do you wait?`);

    // 2. Inject DB Tables
    setDbTables({
      'Products_Table': database.products,
      'Search_Logs': [
        { id: 1, term: query, timestamp: new Date().toISOString(), user: 'anonymous' }
      ]
    });

    // 3. Inject API Endpoints
    setApiEndpoints([
      {
        method: 'GET',
        path: `/api/v1/search?q=${encodeURIComponent(query)}`,
        description: 'Queries the product database for the given term.',
        handler: async () => {
          try {
            const data = await MockAPI.getProducts(query);
            return { status: 200, body: data };
          } catch (e) {
            return { status: 500, body: { error: (e as Error).message } };
          }
        },
      }
    ]);

    setRemoteSolutions({ app: 'catalog', bugIds: ['SEARCH-01', 'SEARCH-02', 'CAT-08', 'SEARCH-03', 'SEARCH-04'] });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    MockAPI.getProducts(query)
      .then(data => {
        setProducts(data);
        setLoading(false);
        setError('');
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [query, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  return (
    <div className="animate-fade-in">
      <button className="btn btn-secondary" onClick={() => navigate('/catalog')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Home
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Search Results</h1>
      
      {/* Bug Level 9: XSS Simulation (carried over from v01) */}
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Showing results for: <span dangerouslySetInnerHTML={{ __html: query }} />
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Searching database...</p>
      ) : (
        <div className="grid-cards">
          {products.length === 0 && !error ? (
            <p style={{ color: 'var(--text-muted)' }}>No products found.</p>
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
