import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';
import { ArrowLeft, Star } from 'lucide-react';

export const ReviewsView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Inject Requirements
    setRequirements(`## Product Reviews
### Acceptance Criteria:
- Must display all reviews for the specified product.
- Sorting should order reviews by rating (High to Low).
- Must accurately display the reviewer's name and date.
- **Bug Hint:** Are you sure these reviews belong to this product? Check the DB Viewer!

### Bug Hints (1 bug in this area):
- 🐛 **Data integrity (Level 7):** Open PROD-002's reviews. Compare the reviewer names against the DB Viewer's \`Reviews_Table\` — do these reviews actually belong to this product?`);

    // 2. Inject DB Tables
    const actualDbProduct = database.products.find(p => p.id === id);
    setDbTables({
      'Products_Table': actualDbProduct ? [actualDbProduct] : [],
      'Reviews_Table': actualDbProduct ? actualDbProduct.reviews : []
    });

    // 3. Inject API Endpoints
    setApiEndpoints([
      {
        method: 'GET',
        path: `/api/v1/products/${id}/reviews`,
        description: 'Fetches all reviews for the product.',
        handler: async () => {
          try {
            const data = await MockAPI.getProductById(id || '');
            return { status: 200, body: data };
          } catch (e) {
            return { status: 404, body: { error: (e as Error).message } };
          }
        },
      },
      {
        method: 'POST',
        path: `/api/v1/products/${id}/reviews`,
        description: 'Submits a new review.',
        payloadTemplate: '{\n  "userId": "U-999",\n  "rating": 5,\n  "comment": "Amazing!"\n}'
      }
    ]);

    setRemoteSolutions({ app: 'catalog', bugIds: ['CAT-06'] });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    if (id) {
      MockAPI.getProductById(id).then(data => {
        setProduct(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  if (loading) return <div className="container">Loading reviews...</div>;
  if (!product) return <div className="container">Product Not Found</div>;

  return (
    <div className="animate-fade-in">
      <button className="btn btn-secondary" onClick={() => navigate(`/catalog/product/${id}`)} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Product
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Reviews for {product.name}</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {product.reviews && product.reviews.length > 0 ? (
          product.reviews.map(rev => (
            <div key={rev.id} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 'bold' }}>{rev.userName}</div>
                <div style={{ display: 'flex', color: '#eab308' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill={i < rev.rating ? "currentColor" : "none"} />
                  ))}
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)' }}>{rev.comment}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', marginTop: '0.5rem' }}>{rev.date}</div>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No reviews yet.</p>
        )}
      </div>
    </div>
  );
};
