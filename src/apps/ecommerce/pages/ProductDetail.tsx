import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Heart } from 'lucide-react';
import { useQAPanel } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS } from '../data/mockStore';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions } = useQAPanel();
  const { addToCart } = useCart();

  const product = PRODUCTS.find(p => p.id === Number(id));
  const [qty, setQty] = useState(1);
  const [reviewText, setReviewText] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [localReviews, setLocalReviews] = useState<{ id: string; comment: string; rating: number }[]>([]);
  // BUG ECO-43: wishlist state lives only in component memory — never persisted.
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    setRequirements(`## Product Detail
### Acceptance Criteria:
- Must display name, price, stock, description, and category.
- Out-of-stock products cannot be added to the cart.
- Review comments must be rendered safely (no HTML injection).
- Related products must actually relate by category.
- Reviews must show a human-readable date.

### Bug Hints (16 bugs on this page):
- 🐛 **Level 9 (Security):** Submit a review with \`<b>bold</b>\` in the comment. What renders?
- 🐛 **Level 5:** Find the out-of-stock product and try adding it here. Does it work?
- 🐛 **Level 2 (Accessibility):** Does the main product image have meaningful alt text?
- 🐛 **Level 4:** Check "Related Products" — are they actually related by category?
- 🐛 **Level 2 (Content):** Do review dates look machine-formatted?
- 🐛 **Level 4 (Boundary):** Clear the quantity field entirely and click Add to Cart.
- 🐛 **Level 3 (Boundary):** Type more than 300 characters into the review box. Is there any limit?
- 🐛 **Level 2:** Is there any average rating or review count shown on this page?
- 🐛 **Level 2 (Accessibility):** Do the star icons convey their rating to a screen reader?
- 🐛 **Level 1:** Is there a "Back to Store" button that actually goes to the storefront?
- 🐛 **Level 2:** Click the product image on the storefront card and then again here — is the whole card/image clickable, or just the title?
- 🐛 **Level 3:** Add a product to your wishlist, then refresh the page. Is it still wishlisted?
- 🐛 **Level 3 (Contrast):** Find an out-of-stock product. Is the "Out of stock" badge easy to read?
- 🐛 **Level 2 (Accessibility):** Is the quantity input labeled in any way a screen reader could announce?
- 🐛 **Level 3 (Keyboard):** Try to reach a "Related Products" card using only the Tab key.`);

    setDbTables({
      Product: product ? [product] : [],
      Reviews: product ? product.reviews : [],
    });

    setApiEndpoints([
      {
        method: 'GET', path: `/api/products/${id}`,
        description: 'Fetch a single product by id.',
        handler: () => {
          const p = PRODUCTS.find(x => x.id === Number(id));
          return p ? { status: 200, body: p } : { status: 404, body: { error: 'Not found' } };
        },
      },
    ]);

    setRemoteSolutions({ app: 'ecommerce', bugIds: ['ECO-19', 'ECO-20', 'ECO-21', 'ECO-22', 'ECO-23', 'ECO-24', 'ECO-25', 'ECO-26', 'ECO-27', 'ECO-28', 'ECO-43', 'ECO-44', 'ECO-45', 'ECO-46'] });
  }, [id, product, setRequirements, setDbTables, setApiEndpoints, setRemoteSolutions]);

  if (!product) return <div className="container">Product Not Found</div>;

  const related = PRODUCTS.filter(p => p.id !== product.id).slice(0, 3);

  const handleAddReview = () => {
    if (selectedRating === 0) return;
    setLocalReviews(prev => [{ id: `LOCAL-${Date.now()}`, comment: reviewText, rating: selectedRating }, ...prev]);
    setReviewText('');
    setSelectedRating(0);
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button className="btn btn-secondary" onClick={() => navigate('/ecommerce')} style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Store
      </button>

      <div className="glass-panel" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <img src={product.image} style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{product.name}</h1>
          <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Category: {product.category}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '1rem' }}>${product.price.toFixed(2)}</div>
          <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>{product.description}</p>
          <div style={{ marginBottom: '1rem' }}>
            {product.stock > 0 ? `${product.stock} in stock` : (
              // BUG ECO-44: #c8c8c8 text on #e0e0e0 background fails WCAG AA contrast.
              <span style={{ color: '#c8c8c8', background: '#e0e0e0', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>Out of stock</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input type="number" className="input-field" style={{ width: '80px' }} value={qty} onChange={(e) => setQty(parseInt(e.target.value))} />
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => addToCart(product.id, qty)}>Add to Cart</button>
          </div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '1rem', background: 'transparent', color: 'var(--text-muted)' }}
            onClick={() => setWishlisted(!wishlisted)}
          >
            <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} style={{ color: wishlisted ? '#ef4444' : 'var(--text-muted)', marginRight: '0.5rem' }} />
            {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Reviews</h2>
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} size={22} fill={star <= selectedRating ? 'currentColor' : 'none'}
                style={{ color: star <= selectedRating ? '#eab308' : 'var(--text-disabled)', cursor: 'pointer' }}
                onClick={() => setSelectedRating(star)} />
            ))}
          </div>
          <textarea className="input-field" rows={2} value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Write a review..." />
          <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} onClick={handleAddReview}>Submit Review</button>
        </div>

        {[...localReviews.map(r => ({ id: r.id, userName: 'You', rating: r.rating, comment: r.comment, date: new Date().toISOString() })), ...product.reviews].map(rev => (
          <div key={rev.id} className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>{rev.userName}</strong>
              <div style={{ display: 'flex', color: '#eab308' }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < rev.rating ? 'currentColor' : 'none'} />)}
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)' }} dangerouslySetInnerHTML={{ __html: rev.comment }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-disabled)' }}>{rev.date}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Related Products</h2>
        <div className="grid-cards">
          {related.map(rp => (
            <div key={rp.id} className="glass-panel" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => navigate(`/ecommerce/product/${rp.id}`)}>
              <img src={rp.image} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
              <h4 style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{rp.name}</h4>
              <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>${rp.price.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
