import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';
import { useCart } from '../context/CartContext';
import { useQAPanel } from '../context/QAPanelContext';
import { ArrowLeft, Star, ShoppingCart, Heart, Info, X } from 'lucide-react';

// BUG-063: XSS in Product Review — review interface for local state
interface LocalReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [reviewText, setReviewText] = useState('');

  // BUG-057: Wishlist Icon Desync — state not persisted to localStorage
  const [wishlisted, setWishlisted] = useState(false);

  // BUG-045: Tooltip Persists on Scroll — tooltip visibility state
  const [showTooltip, setShowTooltip] = useState(false);

  // BUG-050 / BUG-094: Quick View Modal state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // BUG-059: Review Submission Hangs — star rating + submitting state
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // BUG-063: XSS in Product Review — local reviews array
  const [localReviews, setLocalReviews] = useState<LocalReview[]>([]);

  // BUG-094: Keyboard Trap — modal ref for focus trapping
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  // BUG-094: Keyboard Trap in Modal — trap Tab key inside modal
  const handleModalKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // BUG-094: Close modal but do NOT return focus to trigger button
      setQuickViewProduct(null);
      return;
    }

    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstEl = focusableElements[0] as HTMLElement;
      const lastEl = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  }, []);

  // Focus close button when modal opens
  useEffect(() => {
    if (quickViewProduct && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [quickViewProduct]);

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading details...</div>;
  if (!product) return <div className="container">Product Not Found</div>;

  const handleAddReview = () => {
    // Level 3 BUG: Boundary Value Analysis
    // Requirement says max review length is 50 chars.
    // UI doesn't block it, and submission logic doesn't validate it properly.
    if (reviewText.length > 50) {
      // Actually it just lets it pass silently! Bug!
    }

    // BUG-059: Review Submission Hangs — if 0 stars selected, hang forever
    if (selectedRating === 0) {
      setSubmitting(true);
      // BUG-059: Never sets submitting back to false — UI hangs with spinner
      return;
    }

    // BUG-063: XSS in Product Review — store the review with raw HTML comment
    const newReview: LocalReview = {
      id: `LOCAL-${Date.now()}`,
      userName: 'You',
      rating: selectedRating,
      comment: reviewText,
      // BUG-096: Dates Not Localized — raw ISO string
      date: new Date().toISOString().split('T')[0],
    };
    setLocalReviews(prev => [newReview, ...prev]);
    setReviewText('');
    setSelectedRating(0);
  };

  // BUG-012: Get related products for the 'Related Products' section
  const relatedProducts = database.products
    .filter(p => p.id !== product.id)
    .slice(0, 4);

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
          {/* BUG-093: Missing Alt Attributes — empty alt on main product image */}
          <img src={product.images[0]} alt="" style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />

          {/* BUG-044: Color Contrast Violation — low contrast 'Out of Stock' badge */}
          {product.stock === 0 && (
            <div style={{
              // BUG-044: #c8c8c8 text on #e0e0e0 background fails WCAG AA contrast ratio
              color: '#c8c8c8',
              background: '#e0e0e0',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              display: 'inline-block',
              marginTop: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              Out of Stock
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* BUG-042: Overlapping Text on Mobile Safari — hardcoded width causes overflow at 375px */}
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', width: '400px' }}>{product.name}</h1>
          <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>ID: {product.id} | Category: {product.category}</div>
          
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ${product.price.toFixed(2)}
            {/* BUG-045: Tooltip Persists on Scroll — fixed position tooltip stays on screen during scroll */}
            <span
              style={{ position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info size={18} style={{ color: 'var(--text-muted)' }} />
              {showTooltip && (
                <div style={{
                  // BUG-045: position: 'fixed' instead of 'absolute' causes tooltip to stay in place on scroll
                  position: 'fixed',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  width: '220px',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  zIndex: 100,
                  marginTop: '0.25rem',
                }}>
                  Free shipping on orders over $50. Standard delivery 3-5 business days.
                </div>
              )}
            </span>
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

            {/* BUG-013: Missing Accessibility Label — icon-only button with no aria-label */}
            {/* BUG-061: Out of Stock Add to Cart — no stock check, allows adding out-of-stock items */}
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '1rem', fontSize: '1.1rem' }}
              onClick={() => addToCart(product, qty)}
            >
              {/* BUG-013: Only icon, no text, no aria-label — inaccessible to screen readers */}
              <ShoppingCart size={20} />
            </button>
          </div>

          {/* BUG-023: Disabled Button Active — looks disabled but is still clickable */}
          {product.stock === 0 && (
            <button
              className="btn btn-secondary"
              style={{
                marginTop: '0.5rem',
                // BUG-023: Visual styling suggests disabled, but no `disabled` attribute
                opacity: 0.5,
                cursor: 'not-allowed',
              }}
              onClick={() => addToCart(product, 1)}
            >
              Out of Stock
            </button>
          )}

          {/* BUG-014: Missing Hover State — inline style overrides CSS hover */}
          {/* BUG-057: Wishlist Icon Desync — heart toggle not persisted to localStorage, resets on refresh */}
          <button
            className="btn btn-secondary"
            style={{
              marginTop: '1rem',
              // BUG-014: Inline styles override CSS hover states
              background: 'transparent',
              color: 'var(--text-muted)',
            }}
            onClick={() => setWishlisted(!wishlisted)}
          >
            <Heart
              size={18}
              fill={wishlisted ? 'currentColor' : 'none'}
              style={{ color: wishlisted ? '#ef4444' : 'var(--text-muted)', marginRight: '0.5rem' }}
            />
            {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div style={{ marginTop: '4rem' }}>
        <h2 style={{ marginBottom: '2rem' }}>Customer Reviews</h2>
        
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Write a Review</h3>

          {/* BUG-059: Review Submission Hangs — star rating selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="input-label">Rating</label>
            <div style={{ display: 'flex', gap: '0.25rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  fill={star <= selectedRating ? 'currentColor' : 'none'}
                  style={{ color: star <= selectedRating ? '#eab308' : 'var(--text-disabled)' }}
                  onClick={() => setSelectedRating(star)}
                />
              ))}
            </div>
          </div>

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
          <button
            className="btn btn-primary"
            onClick={handleAddReview}
            disabled={submitting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {/* BUG-059: Shows spinner when submitting, but if 0 stars, it never stops */}
            {submitting && (
              <span
                style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            )}
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>

        {/* BUG-063: XSS in Product Review — local reviews rendered with dangerouslySetInnerHTML */}
        {localReviews.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            {localReviews.map(rev => (
              <div key={rev.id} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 'bold' }}>{rev.userName}</div>
                  <div style={{ display: 'flex', color: '#eab308' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill={i < rev.rating ? "currentColor" : "none"} />
                    ))}
                  </div>
                </div>
                {/* BUG-063: XSS vulnerability — renders raw HTML from user input */}
                <p
                  style={{ color: 'var(--text-muted)' }}
                  dangerouslySetInnerHTML={{ __html: rev.comment }}
                />
                {/* BUG-096: Dates Not Localized — raw ISO string displayed */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', marginTop: '0.5rem' }}>{rev.date}</div>
              </div>
            ))}
          </div>
        )}

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
                {/* BUG-096: Dates Not Localized — raw ISO date string, not using toLocaleDateString() */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', marginTop: '0.5rem' }}>{rev.date}</div>
              </div>
            ))}
          </div>
        ) : (
          localReviews.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No reviews yet.</p>
        )}
      </div>

      {/* BUG-012: React Key Duplication — Related Products section uses category as key */}
      <div style={{ marginTop: '4rem' }}>
        <h2 style={{ marginBottom: '2rem' }}>Related Products</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {relatedProducts.map((rp) => (
            // BUG-012: Using product.category as key instead of product.id — causes duplicate key warnings
            <div key={rp.category} className="glass-panel" style={{ padding: '1rem', cursor: 'pointer' }}>
              {/* BUG-093: Missing Alt Attributes — no alt attribute on related product images */}
              <img src={rp.images[0]} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
              <h4 style={{ marginTop: '0.75rem', fontSize: '0.95rem' }}>{rp.name}</h4>
              <div style={{ color: 'var(--primary)', fontWeight: 'bold', marginTop: '0.25rem' }}>${rp.price.toFixed(2)}</div>
              {/* BUG-050: Z-Index Collision on Modal — Quick View button */}
              <button
                className="btn btn-secondary"
                style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickViewProduct(rp);
                }}
              >
                Quick View
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* BUG-050: Z-Index Collision on Modal — modal overlay with zIndex: 10 collides with sidebar zIndex: 10 */}
      {/* BUG-094: Keyboard Trap in Modal — Tab cycles within modal, no way out; focus not returned on close */}
      {quickViewProduct && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // BUG-050: zIndex 10 collides with layout sidebar which is also zIndex 10
            zIndex: 10,
          }}
          onClick={() => setQuickViewProduct(null)}
          onKeyDown={handleModalKeyDown}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>{quickViewProduct.name}</h2>
              {/* BUG-094: Close button does NOT return focus to the trigger button */}
              <button
                ref={closeButtonRef}
                className="btn btn-secondary"
                style={{ padding: '0.5rem', lineHeight: 1 }}
                onClick={() => setQuickViewProduct(null)}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={quickViewProduct.images[0]}
              style={{ width: '100%', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}
            />
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{quickViewProduct.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                ${quickViewProduct.price.toFixed(2)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Stock: {quickViewProduct.stock}
              </span>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              onClick={() => {
                addToCart(quickViewProduct, 1);
                setQuickViewProduct(null);
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* Spinner animation for BUG-059 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
