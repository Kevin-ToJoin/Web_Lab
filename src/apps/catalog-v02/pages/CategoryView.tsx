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
- Category matching must be case-insensitive.
- The number of results found must be visible to the user.

### Bug Hints (9 bugs in this area):
- 🐛 **Level 4 (Equivalence):** Navigate to **Home Goods**. Do all displayed products actually belong to that category? Use the DB Viewer to cross-check — \`Products_Table\` shows the ground truth.
- 🐛 **Level 10 (Race Condition):** Navigate to **Electronics**, then quickly click **Home Goods** before the list loads. Which category's results appear? Try it multiple times.
- 🐛 **Level 3:** Manually edit the URL to \`/catalog/category/electronics\` (lowercase). Does it still find the products?
- 🐛 **Level 3:** Manually edit the URL to an invalid category like \`/catalog/category/Nonsense\`. Is there any indication the category itself doesn't exist?
- 🐛 **Level 3 (Accessibility):** Turn on a screen reader (or check the DOM) while the page is loading. Is the loading state announced?
- 🐛 **Level 2:** On a category card, click the product image instead of the title. Does anything happen?
- 🐛 **Level 1:** Is there any breadcrumb showing you came from Home?
- 🐛 **Level 2 (Content):** Visit a category via a lowercase URL — does the heading look properly capitalized?
- 🐛 **Level 2:** Is the number of matching products shown anywhere on this page?

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
      {
        bugId: 'CAT-L10', title: 'Race condition: Electronics has 1500ms delay vs 300ms for others',
        location: 'MockAPI.ts ~line 14', technique: 'Race Condition',
        buggyCode: `const latency = category === 'Electronics' ? 1500 : 300;
await delay(latency);`,
        fixedCode:  `const latency = 300;
await delay(latency);`,
        explanation: 'Electronics responses take 1500ms while all others take 300ms. Rapidly switching categories causes a slower Electronics response to overwrite a faster Home Goods response — classic race condition.',
      },
      {
        bugId: 'CATV-01', title: 'Category name in the URL is case-sensitive',
        location: 'CategoryView.tsx / MockAPI.ts — category filter', technique: 'Input Validation',
        buggyCode: `results = results.filter(p => p.category === category); // exact match only`,
        fixedCode: `results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());`,
        explanation: 'Visiting /catalog/category/electronics (lowercase) finds nothing, even though "Electronics" is a valid category — the filter requires an exact case match.',
      },
      {
        bugId: 'CATV-02', title: 'Invalid category shows the same message as a valid-but-empty one',
        location: 'CategoryView.tsx — empty state', technique: 'Error Handling',
        buggyCode: `{products.length === 0 && <p>No products found in this category.</p>}
// same message whether "Home Goods" has 0 results or the category doesn't exist at all`,
        fixedCode: `const VALID = ['Electronics', 'Home Goods', 'Apparel', 'Accessories'];
{!VALID.includes(catName) && <p>"{catName}" is not a valid category.</p>}`,
        explanation: 'A typo\'d category in the URL is indistinguishable from a real, empty category — both just say "No products found."',
      },
      {
        bugId: 'CATV-03', title: 'Loading state has no aria-live/aria-busy announcement',
        location: 'CategoryView.tsx — loading state', technique: 'Accessibility',
        buggyCode: `{loading ? <p>Loading products...</p> : ...}`,
        fixedCode: `<p aria-live="polite" aria-busy={loading}>{loading ? 'Loading products...' : ...}</p>`,
        explanation: 'Screen-reader users get no announcement that content is loading or has finished — the text change is silent.',
      },
      {
        bugId: 'CATV-04', title: 'Only the product title is clickable on category cards',
        location: 'CategoryView.tsx — product grid', technique: 'Missing Functionality',
        buggyCode: `<img src={p.images[0]} alt={p.name} ... />
<h4 onClick={() => navigate(...)}>{p.name}</h4>
<div>\${p.price.toFixed(2)}</div>`,
        fixedCode: `<div className="glass-panel" onClick={() => navigate(...)}>
  {/* image, title and price all inside the clickable wrapper */}
</div>`,
        explanation: 'Clicking the product image or price does nothing — only the small title text is an active navigation target.',
      },
      {
        bugId: 'CATV-05', title: 'No breadcrumb navigation showing Home > Category',
        location: 'CategoryView.tsx — page header', technique: 'Missing Functionality',
        buggyCode: `<h1>Category: {catName}</h1>
{/* no breadcrumb trail */}`,
        fixedCode: `<nav aria-label="Breadcrumb"><Link to="/catalog">Home</Link> / {catName}</nav>
<h1>Category: {catName}</h1>`,
        explanation: 'Nothing on the page indicates the site hierarchy, hurting wayfinding for users who land here directly.',
      },
      {
        bugId: 'CATV-06', title: 'Category heading shows the raw URL param instead of proper casing',
        location: 'CategoryView.tsx — page header', technique: 'Content Bug',
        buggyCode: `<h1>Category: {catName}</h1> // renders "Category: electronics" verbatim from the URL`,
        fixedCode: `<h1>Category: {properCase(catName)}</h1> // renders "Category: Electronics"`,
        explanation: 'The heading interpolates the raw route param with no normalization, so a lowercase URL produces a lowercase heading.',
      },
      {
        bugId: 'CATV-07', title: 'Result count is never shown',
        location: 'CategoryView.tsx — product grid header', technique: 'Missing Functionality',
        buggyCode: `<h1>Category: {catName}</h1>
{/* no count of products.length shown anywhere */}`,
        fixedCode: `<p>{products.length} product{products.length !== 1 ? 's' : ''} found</p>`,
        explanation: 'The DB viewer computes per-category counts, but the page itself never tells the user how many results they\'re looking at.',
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
