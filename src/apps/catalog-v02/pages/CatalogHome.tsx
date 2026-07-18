import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQAPanel } from '../context/QAPanelContext';
import { MockAPI } from '../api/MockAPI';
import { type Product, database } from '../api/mockDatabase';

// BUG-049: Carousel slides for the hero banner
const heroSlides = [
  'Spring Sale Event! Up to 50% off!',
  'New Arrivals: Latest Tech Gadgets',
  'Free Shipping on Orders $100+',
];

export const CatalogHome = () => {
  const { setRequirements, setDbTables, setApiEndpoints } = useQAPanel();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    // 1. Inject Requirements
    setRequirements(`## Catalog Dashboard (Home)
### Acceptance Criteria:
- Must display exactly 3 featured items.
- "Shop by Category" must link to valid category filters.
- Hero carousel should auto-rotate every 5 seconds and be readable.
- Search bar must redirect to the Search Results page with the query in the URL.
- **Bug Hint:** Look for hardcoded state or missing navigation links.`);

    // 2. Inject DB Tables
    setDbTables({
      'Featured_Promos': [
        { id: 'promo1', active: true, discount: '20%' },
        { id: 'promo2', active: false, discount: '50%' }
      ],
      'Products_Table_Preview': database.products.slice(0, 2)
    });

    // 3. Inject API Endpoints
    setApiEndpoints([
      { method: 'GET', path: '/api/v1/products/featured', description: 'Returns a list of promoted products.' },
      { method: 'GET', path: '/api/v1/categories', description: 'Returns available store categories.' }
    ]);

    // Fetch data
    MockAPI.getProducts().then(data => setFeatured(data.slice(0, 3)));
  }, [setRequirements, setDbTables, setApiEndpoints]);

  // BUG-049: Carousel auto-scrolls too fast (1500ms instead of ~5000ms)
  // BUG-074: Missing cleanup — interval and DOM nodes accumulate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);

      // BUG-074: Missing cleanup — interval and DOM nodes accumulate
      // Simulate DOM node accumulation on each tick
      const ghost = document.createElement('span');
      ghost.className = 'carousel-ghost-node';
      ghost.style.display = 'none';
      ghost.setAttribute('data-tick', Date.now().toString());
      document.body.appendChild(ghost);
    }, 1500); // BUG-049: 1500ms is way too fast for users to read

    // BUG-074: intentionally omitting clearInterval(interval) cleanup
    // A correct implementation would return () => clearInterval(interval);
    void interval;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // BUG-081: Inefficient DOM queries — getElementById called on every scroll event
  useEffect(() => {
    const handleScroll = () => {
      // BUG-081: getElementById called on every scroll event
      // Should cache the reference outside the handler instead
      const btn = document.getElementById('scroll-top-btn');
      if (window.scrollY > 300) {
        setShowScrollTop(true);
        if (btn) btn.style.opacity = '1';
      } else {
        setShowScrollTop(false);
        if (btn) btn.style.opacity = '0';
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // BUG-097: Empty State Shows NaN
  const resultCountText = featured.length === 0
    ? `Found ${parseInt(undefined as any)} results` // BUG-097: parseInt(undefined) → NaN
    : `Found ${featured.length} products`;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem' }}>TechMart v02</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/catalog/profile')}>Profile</button>
          <button className="btn btn-primary" onClick={() => navigate('/catalog/cart')}>Cart</button>
        </div>
      </div>

      {/* BUG-049: Auto-rotating carousel (too fast)
          BUG-072: Unoptimized hero image — full-res Unsplash URL without size/quality params */}
      <div
        style={{
          // BUG-072: Unoptimized hero image — using full-resolution Unsplash image
          // A correct implementation would add ?w=1200&q=60 to constrain size
          backgroundImage: 'url(https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '3rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '3rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '200px',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(99, 102, 241, 0.85)',
          zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#fff', transition: 'opacity 0.3s' }}>
            {heroSlides[currentSlide]}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            {heroSlides.map((_, i) => (
              <span
                key={i}
                onClick={() => setCurrentSlide(i)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: i === currentSlide ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <button className="btn btn-secondary" style={{ background: '#000', border: 'none', color: '#fff' }}>Shop Now</button>
        </div>
      </div>

      <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Shop by Category</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        {['Electronics', 'Home Goods', 'Apparel', 'Accessories'].map(cat => (
          <div 
            key={cat} 
            className="glass-panel" 
            style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}
            onClick={() => navigate(`/catalog/category/${encodeURIComponent(cat)}`)}
          >
            {cat}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.5rem' }}>Featured Products</h3>
        <div className="input-group" style={{ margin: 0 }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search..." 
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(`/catalog/search?q=${e.currentTarget.value}`);
            }}
          />
        </div>
      </div>

      {/* BUG-097: Shows "Found NaN results" when featured array is empty / loading */}
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        {resultCountText}
      </p>

      <div className="grid-cards">
        {featured.map(p => (
          <div key={p.id} className="glass-panel" style={{ padding: '1.5rem' }}>
            <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' }} />
            <h4 style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate(`/catalog/product/${p.id}`)}>{p.name}</h4>
            <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>${p.price.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* BUG-081: Scroll-to-top button — DOM queried on every scroll event */}
      <button
        id="scroll-top-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: '#000',
          border: 'none',
          fontSize: '1.2rem',
          cursor: 'pointer',
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
          transition: 'opacity 0.3s',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ↑
      </button>
    </div>
  );
};
