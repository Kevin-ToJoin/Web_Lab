import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Heart } from 'lucide-react';
import { useQAPanel, type BugSolution } from '../../../qa/QAContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS } from '../data/mockStore';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
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

    const solutions: BugSolution[] = [
      {
        bugId: 'ECO-19', title: 'Review comments render raw HTML (XSS)',
        location: 'ProductDetail.tsx — local review list', technique: 'Security (XSS)',
        buggyCode: '<p dangerouslySetInnerHTML={{ __html: rev.comment }} />',
        fixedCode: '<p>{rev.comment}</p>',
        explanation: 'A submitted review comment is injected as raw HTML — a stored XSS vector via a script/img tag.',
      },
      {
        bugId: 'ECO-20', title: 'Out-of-stock products can be added from the detail page',
        location: 'ProductDetail.tsx — Add to Cart button', technique: 'Missing Validation',
        buggyCode: '<button onClick={() => addToCart(product.id, qty)}>Add to Cart</button>\n// no product.stock === 0 check',
        fixedCode: '<button disabled={product.stock === 0} onClick={() => addToCart(product.id, qty)}>',
        explanation: 'Unlike the storefront card, the detail page never disables Add to Cart for a 0-stock product.',
      },
      {
        bugId: 'ECO-21', title: 'Main product image has no alt text',
        location: 'ProductDetail.tsx — hero image', technique: 'Accessibility',
        buggyCode: '<img src={product.image} />',
        fixedCode: '<img src={product.image} alt={product.name} />',
        explanation: 'Screen-reader users get no description of the product photo.',
      },
      {
        bugId: 'ECO-22', title: '"Related Products" ignores category',
        location: 'ProductDetail.tsx — related section', technique: 'Content Quality',
        buggyCode: 'const related = PRODUCTS.filter(p => p.id !== product.id).slice(0, 3);',
        fixedCode: 'const related = PRODUCTS.filter(p => p.id !== product.id && p.category === product.category).slice(0, 3);',
        explanation: 'The related list is just the next 3 products in DB order, regardless of whether they share a category.',
      },
      {
        bugId: 'ECO-23', title: 'Review dates render as raw ISO strings',
        location: 'ProductDetail.tsx — review list', technique: 'Content Bug',
        buggyCode: '<span>{rev.date}</span> // "2026-03-02"',
        fixedCode: '<span>{new Date(rev.date).toLocaleDateString()}</span>',
        explanation: 'Dates are shown exactly as stored instead of being formatted for the viewer\'s locale.',
      },
      {
        bugId: 'ECO-24', title: 'Clearing the quantity field silently adds NaN',
        location: 'ProductDetail.tsx — quantity input', technique: 'Boundary Value',
        buggyCode: 'onChange={(e) => setQty(parseInt(e.target.value))} // parseInt("") is NaN',
        fixedCode: 'onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}',
        explanation: 'Clearing the number input makes parseInt return NaN, which flows straight into addToCart with no guard.',
      },
      {
        bugId: 'ECO-25', title: 'Review textarea has no character limit',
        location: 'ProductDetail.tsx — review form', technique: 'Boundary Value',
        buggyCode: '<textarea value={reviewText} onChange={...} /> // no maxLength',
        fixedCode: '<textarea maxLength={300} value={reviewText} onChange={...} />',
        explanation: 'A review of unbounded length can be submitted, with no client-side cap.',
      },
      {
        bugId: 'ECO-26', title: 'No average rating or review count shown',
        location: 'ProductDetail.tsx — reviews header', technique: 'Missing Functionality',
        buggyCode: '<h2>Reviews</h2>\n{/* no average/count summary */}',
        fixedCode: 'const avg = reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1);\n<p>{avg.toFixed(1)} ★ — {reviews.length} reviews</p>',
        explanation: 'Shoppers see individual reviews but never a quick summary stat.',
      },
      {
        bugId: 'ECO-27', title: 'Star ratings have no text alternative',
        location: 'ProductDetail.tsx — star display', technique: 'Accessibility',
        buggyCode: '{[...Array(5)].map((_, i) => <Star key={i} fill={i < rev.rating ? "currentColor" : "none"} />)}',
        fixedCode: '<span role="img" aria-label={`${rev.rating} out of 5 stars`}>...</span>',
        explanation: 'The star icons are purely decorative SVGs — a screen reader announces nothing about the rating value.',
      },
      {
        bugId: 'ECO-28', title: 'Storefront product cards: only the title is clickable',
        location: 'Storefront.tsx — product cards', technique: 'Missing Functionality',
        buggyCode: '<img src={product.image} />\n<h3 onClick={() => navigate(...)}>{product.name}</h3>',
        fixedCode: '<div onClick={() => navigate(...)}>{/* image + title both inside */}</div>',
        explanation: 'Clicking the product image does nothing — only the small title text navigates to the detail page.',
      },
      {
        bugId: 'ECO-43', title: 'Wishlist status is never persisted',
        location: 'ProductDetail.tsx — wishlisted state', technique: 'Stale State',
        buggyCode: `const [wishlisted, setWishlisted] = useState(false); // never read/written to localStorage`,
        fixedCode: `const [wishlisted, setWishlisted] = useState(() => localStorage.getItem(\`wish_\${id}\`) === '1');
useEffect(() => { localStorage.setItem(\`wish_\${id}\`, wishlisted ? '1' : '0'); }, [wishlisted]);`,
        explanation: 'Reloading the page always resets the wishlist heart, since it only ever lives in component state.',
      },
      {
        bugId: 'ECO-44', title: '"Out of stock" badge fails WCAG AA contrast',
        location: 'ProductDetail.tsx — stock badge', technique: 'Accessibility (Contrast)',
        buggyCode: `style={{ color: '#c8c8c8', background: '#e0e0e0' }}`,
        fixedCode: `style={{ color: '#5c5c5c', background: '#e0e0e0' }} // ~4.6:1 contrast ratio`,
        explanation: 'Light gray text on a near-identical light gray background falls well under the 4.5:1 WCAG AA minimum.',
      },
      {
        bugId: 'ECO-45', title: 'Quantity input has no associated label',
        location: 'ProductDetail.tsx — quantity input', technique: 'Accessibility',
        buggyCode: `<input type="number" value={qty} onChange={...} /> // no <label> at all`,
        fixedCode: `<label htmlFor="qty">Quantity</label>\n<input id="qty" type="number" value={qty} onChange={...} />`,
        explanation: 'A screen-reader user tabbing to this field hears no indication of what it controls.',
      },
      {
        bugId: 'ECO-46', title: 'Related product cards are not keyboard-accessible',
        location: 'ProductDetail.tsx — related products grid', technique: 'Accessibility',
        buggyCode: `<div className="glass-panel" onClick={() => navigate(...)}>...</div>`,
        fixedCode: `<button className="glass-panel" onClick={() => navigate(...)}>...</button>`,
        explanation: 'A clickable <div> with no tabIndex/role is invisible to keyboard-only and screen-reader navigation.',
      },
    ];
    setSolutions(solutions);
  }, [id, product, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
