import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';
import { useCart } from '../context/CartContext';
import { useQAPanel } from '../context/QAPanelContext';
import { ArrowLeft, Star, ShoppingCart } from 'lucide-react';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    setRequirements(`## Product Detail
### Acceptance Criteria:
- Display product image, name, category, and price.
- Must be able to select quantity and add to cart.
- The "Back to Catalog" button must return the user to the catalog home page.
- The "Add to Wishlist" button must be enabled and functional.
- Review textarea must enforce a maximum of 50 characters.
- Must display customer reviews for the **current** product only.

### Bug Hints (3 bugs on this page):
- 🐛 **Level 2:** Try clicking "Back to Catalog" — where does it actually go?
- 🐛 **Level 2:** Is there any button that appears broken/disabled when it should work?
- 🐛 **Level 3:** The review form says max 50 chars. Can you submit more than that?
- 🐛 **Level 7:** Look at the DB viewer. Do the reviews shown match this product's ID?`);

    const p = database.products.find(x => x.id === id);
    setDbTables({
      'Products_Table': p ? [p] : [],
      'Reviews_Table': p ? p.reviews : []
    });

    setApiEndpoints([
      {
        method: 'GET',
        path: `/api/v1/products/${id}`,
        description: 'Fetch product details.',
        handler: async () => {
          try {
            const data = await MockAPI.getProductById(id || '');
            return { status: 200, body: data };
          } catch (e) {
            return { status: 404, body: { error: (e as Error).message } };
          }
        },
      },
      { method: 'POST', path: '/api/v1/cart', description: 'Add item to cart.', payloadTemplate: '{\n  "productId": "PROD-1",\n  "qty": 1\n}' }
    ]);

    setSolutions([
      {
        bugId: 'CAT-03', title: 'Back button navigates to invalid URL',
        location: 'ProductDetail.tsx ~line 69', technique: 'Broken Link',
        buggyCode: `onClick={() => navigate('/catalog/invalid-url')}`,
        fixedCode:  `onClick={() => navigate('/catalog')}`,
        explanation: 'The onClick handler has a hardcoded typo. It navigates to a non-existent route instead of the catalog home.',
      },
      {
        bugId: 'CAT-04', title: 'Add to Wishlist button is permanently disabled',
        location: 'ProductDetail.tsx ~line 106', technique: 'Broken UI',
        buggyCode: `<button className="btn btn-secondary" disabled>
  Add to Wishlist
</button>`,
        fixedCode:  `<button className="btn btn-secondary" onClick={handleAddToWishlist}>
  Add to Wishlist
</button>`,
        explanation: 'The `disabled` attribute is hardcoded with no conditional. The button should be enabled and trigger a wishlist action.',
      },
      {
        bugId: 'CAT-06b', title: 'Review textarea has no maxLength enforcement',
        location: 'ProductDetail.tsx ~line 124', technique: 'Boundary Value',
        buggyCode: `<textarea
  className="input-field"
  rows={3}
  value={reviewText}
  onChange={(e) => setReviewText(e.target.value)}
  // BUG: Missing maxLength prop!
/>`,
        fixedCode:  `<textarea
  className="input-field"
  rows={3}
  maxLength={50}
  value={reviewText}
  onChange={(e) => setReviewText(e.target.value)}
/>`,
        explanation: 'The label says max 50 chars but no `maxLength` attribute is set on the textarea. The submit handler also skips validation silently.',
      },
    ]);

    if (id) {
      MockAPI.getProductById(id)
        .then(data => {
          setProduct(data);
          setLoading(false);
        })
        .catch(() => setLoading(false)); // Level 6 BUG: Silent failure on error, just stays white/empty
    }
  }, [id, setRequirements, setDbTables, setApiEndpoints]);

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading details...</div>;
  if (!product) return <div className="container">Product Not Found</div>;

  const handleAddReview = () => {
    // Level 3 BUG: Boundary Value Analysis
    // Requirement says max review length is 50 chars.
    // UI doesn't block it, and submission logic doesn't validate it properly.
    if (reviewText.length > 50) {
      // Actually it just lets it pass silently! Bug!
    }
    alert("Review submitted! (Simulated)");
    setReviewText('');
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Level 2 BUG: Broken Link / Misleading Navigation */}
      {/* Clicking back always hard navigates to '/catalog/invalid' because of a typo */}
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/catalog/invalid-url')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      <div className="glass-panel" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <img src={product.images[0]} alt={product.name} style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{product.name}</h1>
          <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>ID: {product.id} | Category: {product.category}</div>
          
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '2rem' }}>
            ${product.price.toFixed(2)}
          </div>

          <p style={{ fontSize: '1.1rem', lineHeight: '1.6', flex: 1 }}>{product.description}</p>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '2rem' }}>
            <input 
              type="number" 
              className="input-field" 
              value={qty} 
              onChange={(e) => setQty(parseInt(e.target.value))}
              style={{ width: '80px' }}
            />
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '1rem', fontSize: '1.1rem' }}
              onClick={() => addToCart(product, qty)}
            >
              <ShoppingCart size={20} /> Add to Cart
            </button>
          </div>
          {/* Level 2 BUG: Disabled button that shouldn't be disabled */}
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} disabled>
            Add to Wishlist
          </button>
        </div>
      </div>

      <div style={{ marginTop: '4rem' }}>
        <h2 style={{ marginBottom: '2rem' }}>Customer Reviews</h2>
        
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Write a Review</h3>
          <div className="input-group">
            <label className="input-label">Your Review (Max 50 chars)</label>
            <textarea 
              className="input-field" 
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              // BUG: Missing maxLength prop!
            />
          </div>
          <button className="btn btn-primary" onClick={handleAddReview}>Submit Review</button>
        </div>

        {product.reviews && product.reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {product.reviews.map(rev => (
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
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No reviews yet.</p>
        )}
      </div>

    </div>
  );
};
