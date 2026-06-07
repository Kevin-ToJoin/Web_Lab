import { useEffect, useState } from 'react';
import { MockAPI } from '../api/MockAPI';
import { type Product } from '../api/mockDatabase';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CatalogHub = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { addToCart, totalItems } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    
    // Level 10 BUG: Race Condition
    // If user changes category rapidly, the requests fire. When they resolve, 
    // they overwrite state in arbitrary order because we don't check `active`.
    // Actually, I defined `active` but I'm intentionally NOT checking it before setting state.
    
    MockAPI.getProducts(search, category)
      .then(data => {
        setProducts(data);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        // Level 6 BUG: Raw Error Display
        // Displays raw JSON/stack trace to the user instead of a friendly message.
        setError(err.message);
        setLoading(false);
      });

  }, [search, category]); // Level 5 BUG: We don't depend on `page`, so changing page doesn't actually trigger API.

  const handleNextPage = () => {
    // Level 2 BUG: Basic Interaction
    // Next button does nothing on page 1 because of a flawed condition.
    if (page > 1) {
      setPage(page + 1);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* Top Navbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>V100 Tech Catalog</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/catalog/cart')} style={{ position: 'relative' }}>
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div className="input-group" style={{ flex: 1, margin: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search products (Try 'error' or 'infinite')..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
        <select 
          className="input-field" 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Home Goods">Home Goods</option>
          <option value="Apparel">Apparel</option>
          <option value="Accessories">Accessories</option>
        </select>
      </div>

      {/* Level 9 BUG: Security XSS Simulation */}
      {search && (
        <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Showing results for: <span dangerouslySetInnerHTML={{ __html: search }} />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
          CRITICAL FAILURE: {error}
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner">Loading...</div>
        </div>
      ) : (
        <div className="grid-cards">
          {products.map((p, index) => (
            // Level 7 BUG: React Key warning / duplication
            // Using index as key causes nasty bugs when list is filtered/sorted.
            <div key={index} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }} />
              
              <h3 
                style={{ fontSize: '1.1rem', marginBottom: '0.5rem', cursor: 'pointer', color: 'var(--primary)' }}
                onClick={() => navigate(`/catalog/product/${p.id}`)}
              >
                {p.name}
              </h3>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', flex: 1 }}>
                {p.category}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>${p.price.toFixed(2)}</span>
                
                {/* Level 1 BUG: Missing label and no accessible text for "Add to Cart" */}
                {/* Level 2 BUG: Hover state missing (btn-secondary usually has it, but we override it inline) */}
                <button 
                  className="btn btn-secondary" 
                  style={{ background: 'transparent' }}
                  onClick={() => addToCart(p, 1)}
                >
                  <ShoppingCart size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
        <button className="btn btn-secondary" onClick={() => setPage(Math.max(1, page - 1))}>Previous</button>
        <span style={{ display: 'flex', alignItems: 'center' }}>Page {page}</span>
        <button className="btn btn-secondary" onClick={handleNextPage}>Next</button>
      </div>

    </div>
  );
};
