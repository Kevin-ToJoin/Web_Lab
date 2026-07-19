import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';
import { ArrowLeft, Star } from 'lucide-react';

export const ReviewsView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Inject Requirements
    setRequirements(`## Product Reviews
### Acceptance Criteria:
- Must display all reviews for the specified product.
- Sorting should order reviews by rating (High to Low).
- Must accurately display the reviewer's name and date.
- Must be reachable from somewhere in the normal navigation flow.
- Must show a summary (average rating, review count) since this is a dedicated reviews page.
- **Bug Hint:** Are you sure these reviews belong to this product? Check the DB Viewer!

### Bug Hints (8 bugs in this area):
- 🐛 **Level 5:** Are the reviews shown sorted from highest to lowest rating?
- 🐛 **Level 4:** Starting from the Product Detail page, try to find a link or button to reach this Reviews page. Is there one?
- 🐛 **Level 7 (Data Integrity):** Open PROD-002's reviews. Compare the reviewer names against the DB Viewer's \`Reviews_Table\`.
- 🐛 **Level 2:** Does this page show an average rating or a total review count anywhere?
- 🐛 **Level 2 (Content):** Look at the review dates — are they human-readable?
- 🐛 **Level 3:** Navigate directly to this route with no product id in the URL. What happens when you click "Back to Product"?
- 🐛 **Level 2 (Accessibility):** Do the star ratings convey their value to a screen reader, or are they purely visual?
- 🐛 **Level 1:** If a product has no reviews yet, is there any way to write one from this page?`);

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

    setSolutions([
      {
        bugId: 'REV-01', title: 'Reviews are not sorted by rating as required',
        location: 'ReviewsView.tsx — reviews list', technique: 'Missing Functionality',
        buggyCode: `product.reviews.map(rev => (...)) // rendered in raw DB order`,
        fixedCode: `[...product.reviews].sort((a, b) => b.rating - a.rating).map(rev => (...))`,
        explanation: 'The requirements call for High-to-Low rating order, but reviews are rendered in whatever order they happen to sit in the database.',
      },
      {
        bugId: 'REV-02', title: 'Dedicated Reviews page exists but nothing links to it',
        location: 'index.tsx route + ProductDetail.tsx', technique: 'Missing Functionality',
        buggyCode: `<Route path="product/:id/reviews" element={<ReviewsView />} />
// no <Link> or button anywhere in ProductDetail.tsx points here`,
        fixedCode: `<Link to={\`/catalog/product/\${id}/reviews\`}>See all reviews</Link>`,
        explanation: 'The route is fully implemented and functional, but a QA tester (or real user) has no way to discover it without reading the router source or guessing the URL.',
      },
      {
        bugId: 'CAT-06', title: 'PROD-002 displays reviews belonging to PROD-001',
        location: 'MockAPI.ts — getProductById', technique: 'Data Integrity',
        buggyCode: `if (id === 'PROD-002') {\n  product.reviews = database.products.find(p => p.id === 'PROD-001').reviews;\n}`,
        fixedCode: `// Return the product's own reviews; remove the PROD-001 substitution.`,
        explanation: 'getProductById swaps in PROD-001\'s reviews when fetching PROD-002, so the wrong reviews are shown. Open PROD-002 and compare against the DB viewer.',
      },
      {
        bugId: 'REV-03', title: 'No average rating or review count shown',
        location: 'ReviewsView.tsx — page header', technique: 'Missing Functionality',
        buggyCode: `<h1>Reviews for {product.name}</h1>
{/* no average/count summary despite this being a dedicated reviews page */}`,
        fixedCode: `const avg = product.reviews.reduce((s, r) => s + r.rating, 0) / (product.reviews.length || 1);
<p>{avg.toFixed(1)} ★ average — {product.reviews.length} reviews</p>`,
        explanation: 'A page whose whole purpose is reviews never surfaces the one summary stat (average rating) a shopper actually wants.',
      },
      {
        bugId: 'REV-04', title: 'Review dates render as raw ISO strings',
        location: 'ReviewsView.tsx — review date display', technique: 'Content Bug',
        buggyCode: `<div>{rev.date}</div> // e.g. "2023-10-01"`,
        fixedCode: `<div>{new Date(rev.date).toLocaleDateString()}</div>`,
        explanation: 'Dates are shown exactly as stored (ISO format) instead of being localized for the reader.',
      },
      {
        bugId: 'REV-05', title: '"Back to Product" can navigate to a broken URL',
        location: 'ReviewsView.tsx — back button', technique: 'Edge Case',
        buggyCode: `onClick={() => navigate(\`/catalog/product/\${id}\`)}
// if id is undefined, this becomes '/catalog/product/undefined'`,
        fixedCode: `onClick={() => id ? navigate(\`/catalog/product/\${id}\`) : navigate('/catalog')}`,
        explanation: 'There is no guard for a missing route param, so a malformed URL produces a literal "/catalog/product/undefined" navigation.',
      },
      {
        bugId: 'REV-06', title: 'Star rating icons have no text alternative',
        location: 'ReviewsView.tsx — star display', technique: 'Accessibility',
        buggyCode: `{[...Array(5)].map((_, i) => (
  <Star key={i} size={16} fill={i < rev.rating ? "currentColor" : "none"} />
))}`,
        fixedCode: `<span role="img" aria-label={\`\${rev.rating} out of 5 stars\`}>
  {[...Array(5)].map((_, i) => <Star key={i} ... aria-hidden="true" />)}
</span>`,
        explanation: 'The star icons are purely decorative SVGs — a screen reader announces nothing about the actual rating value.',
      },
      {
        bugId: 'REV-07', title: '"No reviews yet" has no call-to-action',
        location: 'ReviewsView.tsx — empty state', technique: 'Missing Functionality',
        buggyCode: `<p style={{ color: 'var(--text-muted)' }}>No reviews yet.</p>`,
        fixedCode: `<p>No reviews yet. <Link to={\`/catalog/product/\${id}\`}>Be the first to write one.</Link></p>`,
        explanation: 'The empty state is a dead end — it never points the user back to where they can actually submit a review.',
      },
    ]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    if (id) {
      MockAPI.getProductById(id).then(data => {
        setProduct(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
