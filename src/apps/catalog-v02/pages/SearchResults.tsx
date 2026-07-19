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
  const { setRequirements, setDbTables, setApiEndpoints, setSolutions } = useQAPanel();
  
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
- Search must match against all relevant product fields, not just the name.
- **Bug Hint:** Try searching for 'error' to see how the system handles it, or try injecting HTML tags.

### Bug Hints (9 bugs in this area):
- 🐛 **Level 3 (Boundary):** Clear the search box entirely and submit. Does it return everything?
- 🐛 **Level 1 (Content):** Search for "stand" — look closely at the product name in the results.
- 🐛 **Level 9 (Security):** Search for \`<b>bold</b>\` or a \`<script>\` tag. What renders?
- 🐛 **Level 6:** Search for the literal word "error". What do you see?
- 🐛 **Level 6:** Search for the literal word "infinite". How long do you wait?
- 🐛 **Level 2:** Is the number of results shown anywhere on this page?
- 🐛 **Level 3 (Accessibility):** After a search completes, does keyboard focus move anywhere useful?
- 🐛 **Level 4 (Boundary):** Search for a single space character. What comes back?
- 🐛 **Level 5:** Search for a word that only appears in a product's tags (not its name), like "gaming". Does it find anything?`);

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

    setSolutions([
      {
        bugId: 'SEARCH-01', title: 'Search returns all products when query is empty',
        location: 'MockAPI.ts', technique: 'Boundary Value',
        buggyCode: `if (query) { results = results.filter(...) }\n// Empty string is falsy, skips filter entirely`,
        fixedCode: `if (query && query.trim().length > 0) { results = results.filter(...) }`,
        explanation: 'An empty search query bypasses the filter, returning all products instead of zero results. Guard with a trimmed length check.',
      },
      {
        bugId: 'SEARCH-02', title: 'Typo in product name "Laptap Stand" instead of "Laptop Stand"',
        location: 'mockDatabase.ts — PROD-012', technique: 'Content Bug',
        buggyCode: `name: 'Laptap Stand', // Typo "Laptap"`,
        fixedCode: `name: 'Laptop Stand',`,
        explanation: 'A typo in the mock database causes the product name to appear misspelled in every view — search results, cards, and the product detail page.',
      },
      {
        bugId: 'CAT-08', title: 'Search query rendered as raw HTML (XSS)',
        location: 'SearchResults.tsx', technique: 'Security (XSS)',
        buggyCode: `<span dangerouslySetInnerHTML={{ __html: query }} />`,
        fixedCode: `<span>{query}</span>`,
        explanation: 'The search term is injected with dangerouslySetInnerHTML, so a query like <b>x</b> or a <script> tag is rendered as live DOM — a stored/reflected XSS vector. Render it as plain text so React escapes it.',
      },
      {
        bugId: 'SEARCH-03', title: 'Searching "error" shows a raw technical stack trace',
        location: 'MockAPI.ts — getProducts / SearchResults.tsx error state', technique: 'Error Handling',
        buggyCode: `throw new Error("500 Internal Server Error: JSON parse failed at line 1 column 1");
// ...
setError(err.message); // shown verbatim to the user`,
        fixedCode: `setError('Something went wrong. Please try your search again.');`,
        explanation: 'The raw exception message — including implementation details like a stack-trace-style string — is displayed directly to the end user.',
      },
      {
        bugId: 'SEARCH-04', title: 'Searching "infinite" hangs the page forever',
        location: 'MockAPI.ts — getProducts', technique: 'Async / Infinite Loop',
        buggyCode: `if (search.toLowerCase() === 'infinite') {
  await delay(9999999); // effectively never resolves
}`,
        fixedCode: `// Use a real AbortController-based timeout so a slow request
// fails gracefully instead of hanging the UI indefinitely.`,
        explanation: 'A near-10,000-second delay leaves the "Searching database..." state on screen indefinitely with no cancel button or timeout.',
      },
      {
        bugId: 'SEARCH-05', title: 'Result count is never displayed',
        location: 'SearchResults.tsx — results grid', technique: 'Missing Functionality',
        buggyCode: `<h1>Search Results</h1>
{/* no count of products.length anywhere */}`,
        fixedCode: `<p>{products.length} result{products.length !== 1 ? 's' : ''} for "{query}"</p>`,
        explanation: 'The acceptance criteria explicitly require a found-items count, but the page never renders one.',
      },
      {
        bugId: 'SEARCH-06', title: 'Focus never moves to the results after a search',
        location: 'SearchResults.tsx — results heading', technique: 'Accessibility',
        buggyCode: `<h1 style={{ fontSize: '2rem' }}>Search Results</h1>
{/* no ref, no focus() call after navigation */}`,
        fixedCode: `const headingRef = useRef<HTMLHeadingElement>(null);
useEffect(() => { headingRef.current?.focus(); }, [query]);
<h1 ref={headingRef} tabIndex={-1}>Search Results</h1>`,
        explanation: 'After a client-side navigation to a new search, keyboard/screen-reader focus stays wherever it was — there is no orientation cue that new content loaded.',
      },
      {
        bugId: 'SEARCH-07', title: 'A single-space query matches almost every product',
        location: 'MockAPI.ts — getProducts', technique: 'Boundary Value',
        buggyCode: `if (search) { results = results.filter(p => p.name.toLowerCase().includes(search.toLowerCase())); }
// " " is truthy, and nearly every multi-word product name contains a space`,
        fixedCode: `const trimmed = search.trim();
if (trimmed) { results = results.filter(p => p.name.toLowerCase().includes(trimmed.toLowerCase())); }`,
        explanation: 'A whitespace-only query passes the truthy check (unlike an empty string) and then matches any product name containing a space — nearly all of them.',
      },
      {
        bugId: 'SEARCH-08', title: 'Search only matches product names — tags are ignored',
        location: 'MockAPI.ts — getProducts', technique: 'Missing Functionality',
        buggyCode: `results = results.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
// p.tags (e.g. ['gaming', 'wireless']) is never checked`,
        fixedCode: `results = results.filter(p =>
  p.name.toLowerCase().includes(search.toLowerCase()) ||
  p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
);`,
        explanation: 'Every product has a tags array meant for discovery, but the search implementation never reads it — searching "gaming" misses the gaming monitor and keyboard.',
      },
    ]);
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
  }, [query, setRequirements, setDbTables, setApiEndpoints, setSolutions]);

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
